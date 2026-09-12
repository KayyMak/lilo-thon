/**
 * Harness templates.
 *
 * A harness wraps student source so it reads test cases as JSON on stdin,
 * calls the entry point, and prints a JSON verdict. It has to be written in
 * the student's own language, which is the real cost of supporting a new one:
 * Python and JavaScript parse JSON out of the box, so their harnesses are
 * short. A language without built-in JSON parsing needs a different strategy —
 * inlining the test inputs as literals rather than passing them on stdin.
 *
 * Nothing here is shared with the execution service. A harness is about the
 * language, an adapter is about the service, and they change for different
 * reasons.
 */

/**
 * Marker printed immediately before the JSON result payload.
 *
 * Student code may print whatever it likes while debugging, so the result
 * cannot simply be "whatever landed on stdout". We scan for the LAST
 * occurrence, which also means a student printing this string themselves
 * cannot spoof a verdict.
 */
export const RESULT_MARKER = "___LILO_RESULTS___";

export function wrapPython(source: string): string {
  return `${source}

# ------------------------- lilo harness -------------------------
import json as _lilo_json, sys as _lilo_sys

def _lilo_main():
    payload = _lilo_json.loads(_lilo_sys.stdin.read())
    fn = None
    for _name in payload["entryPoints"]:
        _cand = globals().get(_name)
        if callable(_cand):
            fn = _cand
            break
    if fn is None:
        print("${RESULT_MARKER}" + _lilo_json.dumps({
            "error": "entry_point_not_found",
            "lookedFor": payload["entryPoints"],
        }))
        return
    _results = []
    for _case in payload["cases"]:
        try:
            _actual = fn(*_case["input"])
            _results.append({"passed": _actual == _case["expected"], "actual": _actual})
        except Exception as _exc:
            _results.append({
                "passed": False,
                "error": type(_exc).__name__ + ": " + str(_exc),
            })
    print("${RESULT_MARKER}" + _lilo_json.dumps({"results": _results}, default=str))

_lilo_main()
`;
}

export function wrapJavaScript(source: string): string {
  return `${source}

// ------------------------- lilo harness -------------------------
function __liloResolve(names) {
  for (const name of names) {
    try {
      // Direct eval sees module-scope declarations; globalThis does not.
      const candidate = eval(name);
      if (typeof candidate === "function") return candidate;
    } catch (_) {
      // not defined in scope; try the next candidate
    }
  }
  return null;
}

(function () {
  const chunks = [];
  process.stdin.on("data", (d) => chunks.push(d));
  process.stdin.on("end", () => {
    const payload = JSON.parse(chunks.join(""));
    const fn = __liloResolve(payload.entryPoints);
    if (!fn) {
      console.log("${RESULT_MARKER}" + JSON.stringify({
        error: "entry_point_not_found",
        lookedFor: payload.entryPoints,
      }));
      return;
    }
    const results = payload.cases.map((c) => {
      try {
        const actual = fn(...c.input);
        // Structural comparison: arrays and objects compare by value.
        return { passed: JSON.stringify(actual) === JSON.stringify(c.expected), actual };
      } catch (e) {
        const name = e && e.name ? e.name : "Error";
        const message = e && e.message ? e.message : String(e);
        return { passed: false, error: name + ": " + message };
      }
    });
    console.log("${RESULT_MARKER}" + JSON.stringify({ results }));
  });
})();
`;
}

/**
 * Strip markdown code fences from pasted source.
 *
 * Students paste out of chat tools, editors and problem sites, and a stray
 * ``` is a syntax error with nothing to teach them. Be liberal in what we
 * accept — a rejection here is a demo that stalls.
 */
export function normalizeSource(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").trim();
  const fenced = text.match(/^```[\w+-]*\n([\s\S]*?)\n?```$/);
  if (fenced) text = fenced[1];
  return text.trim();
}
