# Architectural & State Diagrams - Session 6

This diagram illustrates the structure of the Javascript codebase components being refactored, highlighting the state dependencies and helper utilities.

```mermaid
graph TD
    subgraph Docs
        index[index.html] --> app[js/app.js]
        index --> ui[js/ui.js]
        index --> map[js/map.js]
        app --> state[js/state.js]
        ui --> state
        map --> state
        app --> helpers[js/helpers.js]
        ui --> helpers
        map --> helpers
    end
    subgraph Tests
        test[tests/app.test.js] --> app
    end
```
