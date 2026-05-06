#!/bin/bash

set -euo pipefail
IFS=$'\n\t'

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$BASEDIR/app"
RUNTIME_DIR="$BASEDIR/.runtime"
LOG_DIR="$RUNTIME_DIR/logs"
MONGO_DIR="$RUNTIME_DIR/mongodb"

mkdir -p "$LOG_DIR" "$MONGO_DIR"

STARTED_PIDS=()
STARTED_LABELS=()

log() {
  printf '[start_app] %s\n' "$*"
}

warn() {
  printf '[start_app] warning: %s\n' "$*" >&2
}

cleanup() {
  local count="${#STARTED_PIDS[@]}"
  if [ "$count" -eq 0 ]; then
    return
  fi

  log "stopping background services"
  local i
  for ((i=count-1; i>=0; i--)); do
    local pid="${STARTED_PIDS[$i]}"
    local label="${STARTED_LABELS[$i]}"
    if kill -0 "$pid" >/dev/null 2>&1; then
      log "stopping $label (pid $pid)"
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
  done
}

trap cleanup EXIT INT TERM

load_env_file() {
  local file="$1"
  if [ ! -f "$file" ]; then
    return
  fi

  log "loading env from ${file#$BASEDIR/}"
  set -a
  # shellcheck source=/dev/null
  . "$file"
  set +a
}

port_ready() {
  local port="$1"
  (exec 3<>"/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1
}

wait_for_url() {
  local url="$1"
  local name="$2"
  local timeout="${3:-30}"
  local deadline=$((SECONDS + timeout))
  local attempt_timeout=2
  local probe_url="$url"

  if [ "$timeout" -lt "$attempt_timeout" ]; then
    attempt_timeout="$timeout"
  fi
  if [ "$attempt_timeout" -lt 1 ]; then
    attempt_timeout=1
  fi

  if is_local_http_url "$probe_url"; then
    probe_url="${probe_url/http:\/\/localhost/http:\/\/127.0.0.1}"
  fi

  until curl \
    --connect-timeout "$attempt_timeout" \
    --max-time "$attempt_timeout" \
    -fsS "$probe_url" >/dev/null 2>&1; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      return 1
    fi
    sleep 1
  done

  log "$name is ready at $url"
  return 0
}

wait_for_port() {
  local port="$1"
  local name="$2"
  local timeout="${3:-20}"
  local elapsed=0

  until port_ready "$port"; do
    if [ "$elapsed" -ge "$timeout" ]; then
      return 1
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  log "$name is listening on 127.0.0.1:$port"
  return 0
}

start_background() {
  local label="$1"
  local workdir="$2"
  local log_file="$3"
  shift 3

  (
    cd "$workdir"
    "$@"
  ) >>"$log_file" 2>&1 &

  local pid=$!
  STARTED_PIDS+=("$pid")
  STARTED_LABELS+=("$label")
  log "$label started (pid $pid, log: ${log_file#$BASEDIR/})"
}

python_modules_ok() {
  local imports="$1"
  python3 -c "$imports" >/dev/null 2>&1
}

is_local_http_url() {
  local url="$1"
  [[ "$url" == http://127.0.0.1* || "$url" == http://localhost* ]]
}

is_local_mongo_uri() {
  local uri="$1"
  [[ "$uri" == mongodb://127.0.0.1* || "$uri" == mongodb://localhost* ]]
}

ensure_local_mongo() {
  : "${MONGODB_URI:=mongodb://127.0.0.1:27017/cost_analysis}"
  : "${MONGODB_DB_NAME:=cost_analysis}"
  export MONGODB_URI MONGODB_DB_NAME

  if port_ready 27017; then
    log "reusing MongoDB on 127.0.0.1:27017"
    return
  fi

  if ! command -v mongod >/dev/null 2>&1; then
    warn "mongod is not installed and MONGODB_URI is not configured"
    exit 1
  fi

  start_background \
    "mongodb" \
    "$BASEDIR" \
    "$LOG_DIR/mongodb.log" \
    mongod \
      --bind_ip 127.0.0.1 \
      --port 27017 \
      --dbpath "$MONGO_DIR" \
      --quiet

  if ! wait_for_port 27017 "MongoDB" 20; then
    warn "MongoDB did not start cleanly. Check .runtime/logs/mongodb.log"
    exit 1
  fi
}

start_real_estate_worker() {
  if wait_for_url "http://127.0.0.1:5000/health" "Real Estate model" 1; then
    export REAL_ESTATE_MODEL_URL="http://127.0.0.1:5000"
    return
  fi

  if ! python_modules_ok "import flask, flask_cors, pandas, numpy, sklearn, joblib, openpyxl"; then
    warn "skipping Real-Estate-Valuation-Model; install its requirements to enable external valuation blending"
    return
  fi

  start_background \
    "real-estate-model" \
    "$BASEDIR/Real-Estate-Valuation-Model" \
    "$LOG_DIR/real-estate-model.log" \
    python3 app.py

  if wait_for_url "http://127.0.0.1:5000/health" "Real Estate model" 30; then
    export REAL_ESTATE_MODEL_URL="http://127.0.0.1:5000"
  else
    warn "Real-Estate-Valuation-Model failed to become healthy. Check .runtime/logs/real-estate-model.log"
  fi
}

start_house_estimator_worker() {
  if wait_for_url "http://127.0.0.1:5002/health" "House estimator" 1; then
    export HOUSE_PRICE_ESTIMATOR_URL="http://127.0.0.1:5002"
    return
  fi

  if ! python_modules_ok "import flask, flask_cors, numpy, sklearn, joblib"; then
    warn "skipping House-Price-Estimator; install its requirements to enable ensemble blending"
    return
  fi

  start_background \
    "house-price-estimator" \
    "$BASEDIR/House-Price-Estimator" \
    "$LOG_DIR/house-price-estimator.log" \
    python3 app.py

  if wait_for_url "http://127.0.0.1:5002/health" "House estimator" 30; then
    export HOUSE_PRICE_ESTIMATOR_URL="http://127.0.0.1:5002"
  else
    warn "House-Price-Estimator failed to become healthy. Check .runtime/logs/house-price-estimator.log"
  fi
}

log "starting local cost analysis stack"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  warn "node and npm are required"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  warn "python3 is required"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  warn "curl is required"
  exit 1
fi

if [ ! -d "$APP_DIR/node_modules" ]; then
  warn "app/node_modules is missing. Run 'cd app && npm install' first."
  exit 1
fi

load_env_file "$APP_DIR/.env"

export NODE_ENV="${NODE_ENV:-development}"
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://127.0.0.1:3000}"

if [ -z "${MONGODB_URI:-}" ]; then
  ensure_local_mongo
elif is_local_mongo_uri "$MONGODB_URI" && ! port_ready 27017; then
  warn "configured MongoDB URI points to localhost but nothing is listening on port 27017; attempting local startup"
  ensure_local_mongo
else
  log "using configured MongoDB from MONGODB_URI"
fi

export REAL_ESTATE_MODEL_URL="${REAL_ESTATE_MODEL_URL:-}"
export REALVALUE_MODEL_URL="${REALVALUE_MODEL_URL:-}"
export HOUSE_PRICE_ESTIMATOR_URL="${HOUSE_PRICE_ESTIMATOR_URL:-}"
export GRAPHSAGE_MODEL_URL="${GRAPHSAGE_MODEL_URL:-}"

if [ -z "$REAL_ESTATE_MODEL_URL" ]; then
  start_real_estate_worker
elif wait_for_url "$REAL_ESTATE_MODEL_URL/health" "Real Estate model" 1; then
  log "using configured Real Estate model at $REAL_ESTATE_MODEL_URL"
elif is_local_http_url "$REAL_ESTATE_MODEL_URL"; then
  warn "configured Real Estate model is not reachable; attempting local startup"
  export REAL_ESTATE_MODEL_URL=""
  start_real_estate_worker
else
  warn "configured Real Estate model is not reachable at $REAL_ESTATE_MODEL_URL"
fi

if [ -z "$HOUSE_PRICE_ESTIMATOR_URL" ]; then
  start_house_estimator_worker
elif wait_for_url "$HOUSE_PRICE_ESTIMATOR_URL/health" "House estimator" 1; then
  log "using configured House estimator at $HOUSE_PRICE_ESTIMATOR_URL"
elif is_local_http_url "$HOUSE_PRICE_ESTIMATOR_URL"; then
  warn "configured House estimator is not reachable; attempting local startup"
  export HOUSE_PRICE_ESTIMATOR_URL=""
  start_house_estimator_worker
else
  warn "configured House estimator is not reachable at $HOUSE_PRICE_ESTIMATOR_URL"
fi

if [ -n "${REALVALUE_MODEL_URL:-}" ]; then
  if wait_for_url "$REALVALUE_MODEL_URL/health" "RealValue worker" 1; then
    log "using configured RealValue worker at $REALVALUE_MODEL_URL"
  else
    warn "configured RealValue worker is not reachable at $REALVALUE_MODEL_URL"
  fi
else
  log "RealValue worker is not configured; the app will stay on local inference for vision blending"
fi

if [ -n "${GRAPHSAGE_MODEL_URL:-}" ]; then
  if wait_for_url "$GRAPHSAGE_MODEL_URL/health" "GraphSAGE worker" 1; then
    log "using configured GraphSAGE worker at $GRAPHSAGE_MODEL_URL"
  else
    warn "configured GraphSAGE worker is not reachable at $GRAPHSAGE_MODEL_URL"
  fi
else
  log "GraphSAGE worker is not configured; the app will stay on local inference for graph signals"
fi

log "launching Next.js on http://127.0.0.1:3001"
cd "$APP_DIR"
npm run dev -- --hostname 127.0.0.1 --port 3001
