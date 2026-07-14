# Remove Navigation Site Title

## Goal

Remove the site title shown at the top-left of the global navigation bar while preserving the existing navigation controls and behavior.

## Scope

- Remove the home-page link that renders `effectiveSiteTitle` in the global `Navigation` component.
- Keep the desktop navigation items and language selector aligned to the right side of the navigation bar.
- Keep the mobile language selector and menu button aligned to the right side of the navigation bar.
- Preserve the site title configuration for metadata and any non-navigation uses.
- Preserve the author name shown in the home-page profile section.

## Implementation Design

Update `src/components/layout/Navigation.tsx` and, if prop cleanup requires it, `src/app/layout.tsx`:

1. Remove the `motion.div` and nested `Link` that render `effectiveSiteTitle`.
2. Remove the now-unused localized site-title calculation and related component props if they have no remaining consumers.
3. Change the navigation row alignment so the remaining desktop and mobile controls stay right-aligned without an empty placeholder.
4. Update the `Navigation` call site in `src/app/layout.tsx` if the removed props are no longer part of the component interface.

No configuration format, content files, metadata, routes, or navigation item behavior will change.

## Responsive Behavior

- Desktop: Home, Blog, Projects, and the language selector remain at the right edge.
- Mobile: the language selector and menu button remain at the right edge; the expandable navigation menu is unchanged.
- The fixed navigation height and the main-content top padding remain unchanged.

## Verification

- Run the production build to catch TypeScript, rendering, and unused-code errors.
- Check the navigation at desktop and mobile widths.
- Confirm the top-left site title is absent.
- Confirm desktop navigation links, the language selector, and the mobile menu still work and remain right-aligned.
- Confirm the profile-section author name and document metadata are unchanged.
