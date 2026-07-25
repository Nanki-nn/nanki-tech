# Clickable Card Surface Design

## Goal

Make each linked Blog and Projects card navigable from the full card surface. Remove the redundant `Read More` and `View Link` labels inside cards while keeping the Blog section's `More` link unchanged.

## Scope

The change is limited to the shared `CardPage` item rendering used on the home page and card-list pages. Content files and destination URLs do not change.

Items with no `link` remain non-interactive and do not receive link-specific cursor or focus styling.

## Interaction Design

- A card with an internal destination uses Next.js `Link` and opens in the current tab.
- A card with an external destination uses a native anchor with `target="_blank"` and `rel="noopener noreferrer"`.
- The visible link is the card title. Its click target is stretched across the card with a positioned pseudo-element, so the markup keeps native link semantics without wrapping the complete card in an anchor.
- Existing independent links rendered inside Markdown content remain above the stretched title-link target and stay independently clickable.
- Linked cards retain the existing border, elevation, and translation hover treatment and add a pointer cursor.
- Keyboard focus on the title link produces a visible ring around the full card through `focus-within` styling.

## Layout

Remove the card-level `Read More` / `View Link` label and its arrow icon. Keep the date aligned at the top right on larger screens and alongside card content on smaller screens. Do not remove or restyle the Blog header's `More` link.

## Accessibility

Navigation remains a native link operation, so Enter activates the focused card link and browser link affordances remain available. External links keep their current new-tab behavior. Focus styling must be visible in light and dark themes.

## Verification

- Run the production build.
- Verify a Blog card navigates internally when clicking the card body.
- Verify a Projects card opens its existing external URL in a new tab.
- Verify `Read More` and `View Link` are absent while the Blog header's `More` link remains.
- Verify keyboard focus outlines the card and Enter follows the link.
- Check desktop and mobile layouts for date alignment, text wrapping, and unwanted empty space.

## Non-Goals

- Changing card content, ordering, destinations, or data types.
- Changing the Blog timeline page or collection cards.
- Removing the Blog section's `More` navigation link.
