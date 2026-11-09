"""Generate browser fixtures from the same data used by the Python service."""
from pathlib import Path
import sys
import json
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from business_data import sources


def build():
    (ROOT/'static/business-data.js').write_text('window.BusinessData = '+json.dumps(sources(), ensure_ascii=False, separators=(',', ':'))+';\n')
    print('Generated synthetic business sources: 1,200 records, 3 supplier offers')


if __name__ == '__main__':
    build()
