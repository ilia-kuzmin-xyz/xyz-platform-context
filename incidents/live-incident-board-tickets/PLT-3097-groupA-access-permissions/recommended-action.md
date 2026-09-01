# PLT-3097 — recommended action (DRAFT ONLY)

Route to Sergey (IAM) with the evidence; no FE change. Keep Critical until the mapping lands.

## Draft comment (author: Ilia; @ Yash, @ Sergey)

> Found it. The sign-in page now asks IAM which SSO provider serves the typed email's domain, and
> only shows the button when IAM names one. IAM currently has that mapping for xyzreality.com only,
> so every customer domain gets an empty answer and no button. That matches Yash's repro exactly.
>
> The customers' own setups are fine. Meta's registration is alive on our side — following our
> authorization URL for the provider "meta" lands on their Okta sign-in with the expected client id.
> What's missing is one mapping row telling IAM that meta.com belongs to that provider.
>
> @Sergey — can you add the discovery mapping meta.com → meta in IAM prod, and check which other
> tenants have a client registration but no domain mapping? That list is exactly who's locked out.
> No frontend release is needed; the button comes back as soon as discovery answers.
>
> @Yash — once Sergey confirms, users may need a page reload (the answer is cached per session).
