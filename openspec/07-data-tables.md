# OpenSpec: 07 Data Tables Component (Modals)

## Overview
A dense data grid for viewing and rapidly editing the entire dataset of Parks and States.

## High-Level Architecture (Cross-Platform / iOS Ready)
Data tables represent the raw dataset.
- **Virtual Scrolling**: To handle large datasets efficiently, the table should employ virtual scrolling. 
- **Action Dispatching**: Interactions (toggling a visit) dispatch discrete actions to the `StateService` rather than mutating the array locally.

## Detailed Claim
The `DataTablesComponent` shall display the full dataset array (100+ items) in a grid format.
- **Dynamic Columns**: Provide dynamic column headers for each configured family member.
- **Sorting**: Support multi-column sorting (Asc/Desc on Name, Region, Member Visit).
- **Rapid Editing**: Clicking a cell must toggle the visit state (`true`/`false`) synchronously via `StateService`. 
- **Filtering**: Include a region filter and a "View All / Single Member" filter.

## Future Scope: Auth & Backend Storage
- **Optimistic UI Updates**: Rapid editing in the table must implement optimistic UI updates when backed by a remote server. The UI toggles instantly, and reverts only if the backend API call fails.
- **Audit Logs**: The backend can track the history of changes made in the data table for accountability or undo functionality.
