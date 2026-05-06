import re

path = r'd:\Code\tensor\Tensor-App\app\valuation-results\[id]\_components\ValuationResults\ValuationResultsWorkspace.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. renderMapView replacement
old_map_rgx = re.compile(
    r'  function renderMapView\(\) \{\s+return \(\s+<div className="-mx-4 -mt-4 space-y-4 lg:-mx-6 lg:-mt-5">(.*?)</div>\s*\);\s*\}',
    re.DOTALL
)

new_map = '''  function renderMapView() {
    return (
      <div className="relative w-full h-[calc(100vh-120px)]">
        {/* Floating Header */}
        <div className="absolute top-4 left-4 z-40 bg-black/80 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-xl pointer-events-auto">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#7bf29b]">Live Spatial Surface</p>
          <p className="text-sm font-medium text-white mt-1">Connectivity: 93/100</p>
        </div>

        <div className="absolute inset-0">
          <MapVisualization
            latitude={report.immersive.latitude}
            longitude={report.immersive.longitude}
            propertyType={report.immersive.propertyType}
            address={report.immersive.address}
            spatialContext={report.immersive.spatialContext}
          />
        </div>
      </div>
    );
  }'''

text = old_map_rgx.sub(new_map, text)

# 2. Map header cleanup: Remove description
text = re.sub(
    r'<p className="mt-3 max-w-3xl text-xs text-\[var\(--on-surface-variant\)\]">\s*\{\/\*\s*\{viewMeta\[activeView\]\.description\}\s*\*\/\}\s*</p>',
    '',
    text
)

# 3. Clean up borders in Main Area
text = text.replace('lg:px-6 xl:grid-cols-[1.2fr_0.8fr]', 'lg:px-0 xl:grid-cols-1')
text = text.replace('px-4 py-4 lg:px-6', 'py-4')
text = text.replace('border-b border-[#27cf6c]/35', '')
text = text.replace('lg:-mx-6 lg:-mt-5', '')
text = text.replace('-mx-4 -mt-4', 'w-full h-full relative')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Edits 1, 2, 3 applied.")
