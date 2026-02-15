import argparse
import json
import os
import sys
from collections import OrderedDict
from typing import Iterable, List, Tuple


Pair = Tuple[str, object]


def _dedupe_pairs_keep_last(pairs: Iterable[Pair]) -> List[Pair]:
    seen: set[str] = set()
    out_rev: List[Pair] = []
    for k, v in reversed(list(pairs)):
        if not isinstance(k, str):
            continue
        if k in seen:
            continue
        seen.add(k)
        out_rev.append((k, v))
    out_rev.reverse()
    return out_rev


def _load_json_pairs(path: str) -> List[Pair]:
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    data = json.loads(raw, object_pairs_hook=list)
    if not isinstance(data, list):
        raise ValueError("root must be a JSON object")
    return data


def _write_canonical_json_object(path: str, pairs: List[Pair]) -> None:
    obj: "OrderedDict[str, object]" = OrderedDict()
    for k, v in pairs:
        obj[k] = v
    text = json.dumps(obj, ensure_ascii=False, indent=4) + "\n"
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def dedupe_json_object_inplace(path: str) -> bool:
    pairs = _load_json_pairs(path)
    deduped = _dedupe_pairs_keep_last(pairs)
    changed = len(deduped) != len(pairs)
    if changed:
        _write_canonical_json_object(path, deduped)
    return changed


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "path",
        nargs="?",
        default=os.path.join("i18n", "zh-cn.json"),
        help="Path to a JSON object file to dedupe (default: i18n/zh-cn.json)",
    )
    args = parser.parse_args(argv)

    try:
        changed = dedupe_json_object_inplace(args.path)
    except Exception as e:
        print(f"[autoremove] error: {e}", file=sys.stderr)
        return 2

    if changed:
        print(f"[autoremove] deduped: {args.path}")
    else:
        print(f"[autoremove] no changes: {args.path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
