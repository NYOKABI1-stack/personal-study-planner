<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep content pages as public TanStack file routes with leaf metadata; shared navigation belongs in the root shell so guest planning remains available.
- AccountProvider owns the single Auth subscription and verified display-name lookup; avoid competing page subscriptions to prevent session races.
- Keep scheduling in the pure planner module; authenticated study-plan reads and writes use validated server functions and owner-only RLS, while guest saves use the legacy device key to preserve existing plans.
- Store display names in profiles with a signup trigger, and reference profiles from study plans, so account deletion removes personal data.
