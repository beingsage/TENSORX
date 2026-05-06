import re

path = r'd:\Code\tensor\Tensor-App\app\valuation-results\[id]\_components\ValuationResults\ValuationResultsWorkspace.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove redundant Map view header (Spatial canvas meta)
content = re.sub(
    r'<div className="shrink-0 border-b border-\[#27cf6c\]/35 px-4 py-4 lg:px-6">.*?</div>\s*<div className="relative min-h-0 flex-1 overflow-hidden">',
    r'<div className="relative min-h-0 flex-1 overflow-hidden">',
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Refactored!')
