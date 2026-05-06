import re
with open(r'd:\Code\tensor\Tensor-App\app\valuation-results\[id]\_components\ValuationResults\ValuationResultsWorkspace.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make Map FULL-WIDTH
text = text.replace(
    '<div className="-mx-4 -mt-4 space-y-4 lg:-mx-6 lg:-mt-5">',
    '<div className="w-full h-full relative">'
)

text = text.replace(
    '<div className="h-full overflow-y-auto px-4 pb-28 pt-4 lg:px-6 lg:pt-5">',
    '<div className="h-full w-full relative">'
)

# Strip out visual map metric UI wrapping
text = re.sub(
    r'<div className="grid gap-4 px-4 lg:px-6 xl:grid-cols-\[1\.2fr_0\.8fr\]">.*?</div>\s*</div>\s*</div>',
    '</div>\n      </div>',
    text,
    flags=re.DOTALL
)

with open(r'd:\Code\tensor\Tensor-App\test_refactor.py', 'w', encoding='utf-8') as f:
    f.write(text)

with open(r'd:\Code\tensor\Tensor-App\app\valuation-results\[id]\_components\ValuationResults\ValuationResultsWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Replaced map layout widths')
