# 24-hour demo timebox, with a path to real students

lilo-thon is built for a judged demo with a 24-hour budget, so the build is optimized for one convincing path through the product: anything off that path is hardcoded, stubbed, or omitted, and shortcuts of that kind are deliberate rather than oversights.

Real students using it later is a stated nice-to-have, not a requirement. The practical consequence is a narrow rule: take shortcuts that are *additive* to undo (hardcoded content that a database could later serve, a heuristic that a model could later replace) and avoid ones that would require reshaping the data model or the learner-facing flow to reverse.
