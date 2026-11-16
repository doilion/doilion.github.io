import json
import os
import sys
import time
from datetime import datetime

from scholarly import scholarly


def fetch_author(scholar_id: str, attempts: int = 3) -> dict:
    """Google Scholar occasionally rejects requests from CI runners, so retry."""
    for attempt in range(1, attempts + 1):
        try:
            author = scholarly.search_author_id(scholar_id)
            return scholarly.fill(
                author, sections=['basics', 'indices', 'counts', 'publications'])
        except Exception as exc:  # noqa: BLE001 - scholarly raises many types
            print(f'Attempt {attempt}/{attempts} failed: {exc!r}', file=sys.stderr)
            if attempt == attempts:
                raise
            time.sleep(30 * attempt)


author = fetch_author(os.environ['GOOGLE_SCHOLAR_ID'])
author['updated'] = str(datetime.now())
author['publications'] = {v['author_pub_id']: v for v in author['publications']}
print(json.dumps(author, indent=2, default=str))

os.makedirs('results', exist_ok=True)
with open('results/gs_data.json', 'w') as outfile:
    json.dump(author, outfile, ensure_ascii=False, default=str)

shieldio_data = {
    "schemaVersion": 1,
    "label": "citations",
    "message": f"{author['citedby']}",
}
with open('results/gs_data_shieldsio.json', 'w') as outfile:
    json.dump(shieldio_data, outfile, ensure_ascii=False)
