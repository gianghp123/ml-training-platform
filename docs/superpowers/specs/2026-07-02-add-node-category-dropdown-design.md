# Add Node Category Dropdown

## Goal

Make the existing Add Node button reliably open a categorized node-template menu and allow users to add a selected node to the workflow.

## Interaction

- Clicking `Add Node` toggles the dropdown.
- The dropdown lists the existing categories in this order: Load Dataset, Data Processing, Model Training, Evaluation, and Deployment & Export.
- Each category displays its existing node templates.
- Clicking inside the dropdown does not trigger outside-click dismissal.
- Clicking outside the Add Node button and dropdown closes the dropdown.
- Selecting a node template creates the node, synchronizes pipeline state, writes the existing terminal log entry, and closes the dropdown.
- The button remains disabled while a pipeline is running.

## Implementation

- Keep `NODE_TEMPLATES` as the single source of menu category and item data.
- Add a ref around the Add Node button and dropdown.
- Replace the unconditional document click close behavior for this menu with containment-aware outside-click handling.
- Preserve the existing close behavior for the context menu and handle menu.
- Do not replace the menu with a new UI library or refactor unrelated pipeline behavior.

## Verification

- Add Node opens the category menu.
- All category labels and template names are visible.
- Clicking within the menu leaves it open unless an item is selected.
- Clicking outside closes it.
- Selecting a template increases the compiled node count and closes the menu.
- Tests and TypeScript checks pass.
