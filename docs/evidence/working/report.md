# Focus contract: passed

Story: demo-popover--working

First failure: none (0 = setup)

| Step | Expected test ID | Actual | Status |
| --- | --- | --- | --- |
| 1 | close | button [data-testid="close"] | passed |
| 2 | close | button [data-testid="close"] | passed |
| 3 | secondary | button [data-testid="secondary"] | passed |
| 4 | close | button [data-testid="close"] | passed |
| 5 | trigger | button [data-testid="trigger"] | passed |
| 6 | trigger | button [data-testid="trigger"] | passed |
| 7 | close | button [data-testid="close"] | passed |
| 8 | trigger | button [data-testid="trigger"] | passed |


Versions: {"tool":"0.1.0","node":"v22.23.1","playwright":"1.65.1","chromium":"159.0.8154.6"}

Only settled focus is asserted. This does not prove absence of transient focus leaks. Reproduction requires the original Storybook service and source. Screenshots may contain rendered page data.
