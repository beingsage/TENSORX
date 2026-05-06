import re

path = r'd:\Code\tensor\Tensor-App\app\valuation-results\[id]\_components\ValuationResults\ValuationResultsWorkspace.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

new_right_rail = '''  function renderRightRailContent() {
    return (
      <div className="flex h-full flex-col bg-[#050805]">
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#7bf29b]/75">
            Context Panel
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="bg-[#08110b] border border-white/5 rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#a7b9a3] mb-1">Value Range</p>
            <p className="text-2xl font-bold tracking-tight text-[#d6e7d2]">
              {formatCurrency(report.valuation.valuation.lowerBound)} - {formatCurrency(report.valuation.valuation.upperBound)}
            </p>
            <p className="text-xs text-[#a7b9a3] mt-2">Point: {formatCurrency(report.valuation.valuation.pointEstimate)}</p>
          </div>

          <div className="bg-[#08110b] border border-white/5 rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#a7b9a3] mb-1">Confidence</p>
            <div className="flex items-end gap-2">
              <p className="text-xl font-bold tracking-tight text-[#d6e7d2]">
                {(report.valuation.valuation.confidence * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-[#7bf29b] mb-1">High</p>
            </div>
          </div>

          <div className="bg-[#08110b] border border-white/5 rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#a7b9a3] mb-1">Risk Score</p>
            <div className="flex items-end gap-2">
              <p className="text-xl font-bold tracking-tight text-[#ffcf94]">
                {report.diagnostics.overallRiskScore}/100
              </p>
              <p className="text-xs text-[#ffcf94] mb-1">Moderate</p>
            </div>
          </div>

          <div className="bg-[#08110b] border border-white/5 rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#a7b9a3] mb-1">Market Pulse</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-[#d6e7d2]">Demand / Supply</span>
              <span className="text-sm font-bold text-white">{report.market.summary.demandIndex}/{report.market.summary.supplyIndex}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-[#d6e7d2]">YoY Growth</span>
              <span className="text-sm font-bold text-[#7bf29b]">{(report.market.summary.priceGrowthYoY * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }'''

rgx = re.compile(
    r'  function renderRightRailContent\(\) \{.*?\n  \}',
    re.DOTALL
)

print(rgx.sub(new_right_rail, text) != text)
text = rgx.sub(new_right_rail, text)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

