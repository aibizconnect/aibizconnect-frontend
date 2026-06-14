/**
 * Real-estate starter content for the Marketing hub (Ali's ask: "prepare Marketing for
 * real estate agents only"). These are built-in presets — NOT seeded DB rows — so they
 * ship in code, work for any realtor tenant, and respect the ONE-TENANT rule. The user
 * still reviews/edits and presses Send (DRAFTS-ONLY law); placeholders in [brackets] are
 * meant to be filled in before sending.
 */

export interface RealtorEmailPreset { name: string; subject: string; preheader: string; body: string }
export interface RealtorSmsPreset { name: string; body: string }

/** One-click email templates a realtor can start a campaign from. */
export const REALTOR_EMAIL_PRESETS: RealtorEmailPreset[] = [
  {
    name: "New listing — just hit the market",
    subject: "Just listed: [Address] — [Beds] bed / [Baths] bath in [Neighbourhood]",
    preheader: "Be among the first to see it before the open house.",
    body:
      "Hi [First name],\n\nA new listing just came to market that I thought you'd want to see first:\n\n[Address], [City]\n[Beds] bed · [Baths] bath · [Sq ft] sq ft · [Price]\n\n[One or two lines on what makes it special — the kitchen, the lot, the location, the schools.]\n\nWant a private showing before this weekend's open house? Just reply to this email or call me at [Phone] and I'll set it up.\n\nTalk soon,\n[Your name]\n[Brokerage] · [Phone]",
  },
  {
    name: "Open house this weekend",
    subject: "Open house Sat & Sun: [Address]",
    preheader: "Drop by — coffee's on me.",
    body:
      "Hi [First name],\n\nI'm hosting an open house this weekend and would love to see you there:\n\n[Address], [City]\nSaturday & Sunday, [Time]\n[Beds] bed · [Baths] bath · [Price]\n\nNo pressure and no appointment needed — come take a look, ask questions, and grab a coffee.\n\nCan't make it but curious? Reply and I'll send you the full photo tour and a private-showing time that works for you.\n\nSee you there,\n[Your name]\n[Brokerage] · [Phone]",
  },
  {
    name: "Just sold — neighbourhood update",
    subject: "Just sold in [Neighbourhood] — here's what it tells us",
    preheader: "What this sale means for your home's value.",
    body:
      "Hi [First name],\n\nAnother home just sold in [Neighbourhood]:\n\n[Address] — listed at [List price], sold for [Sold price] in [X] days.\n\nHomes in the area are [moving quickly / holding value / seeing multiple offers], and that has a direct impact on what your home would sell for today.\n\nIf you've ever wondered what your place is worth in this market, I'm happy to put together a no-obligation valuation for you. Just reply \"value\" and I'll get started.\n\nBest,\n[Your name]\n[Brokerage] · [Phone]",
  },
  {
    name: "Price improvement",
    subject: "Price improved: [Address] is now [New price]",
    preheader: "A fresh opportunity on a home you may have seen.",
    body:
      "Hi [First name],\n\nGood news — the price on [Address] in [City] has just been improved to [New price] (was [Old price]).\n\n[Beds] bed · [Baths] bath · [Sq ft] sq ft\n\nAt this number it's one of the better values in [Neighbourhood] right now, and I expect renewed interest. If you'd like to see it before the next open house, reply or call me at [Phone].\n\n[Your name]\n[Brokerage] · [Phone]",
  },
  {
    name: "Monthly market update",
    subject: "[Month] market update for [City]",
    preheader: "Prices, inventory, and what it means for you.",
    body:
      "Hi [First name],\n\nHere's your quick [Month] snapshot of the [City] market:\n\n• Average sale price: [$] ([up/down X%] from last month)\n• Homes sold: [#]\n• Average days on market: [#]\n• Active listings: [#]\n\nThe short version: it's currently a [buyer's / seller's / balanced] market, which means [one practical takeaway for buyers and one for sellers].\n\nThinking about a move this year? Reply and let's map out the right timing for you.\n\n[Your name]\n[Brokerage] · [Phone]",
  },
  {
    name: "New listings matching your search (buyer alert)",
    subject: "[#] new homes matching what you're looking for",
    preheader: "Fresh listings in [Neighbourhood] this week.",
    body:
      "Hi [First name],\n\nA few new listings just came up that match what you told me you're after in [Neighbourhood]:\n\n1. [Address] — [Beds]bd/[Baths]ba — [Price]\n2. [Address] — [Beds]bd/[Baths]ba — [Price]\n3. [Address] — [Beds]bd/[Baths]ba — [Price]\n\nWant to see any of these in person? Reply with the address (or just \"all\") and I'll line up showings around your schedule.\n\n[Your name]\n[Brokerage] · [Phone]",
  },
  {
    name: "What's your home worth? (seller lead)",
    subject: "What's your home worth in today's [City] market?",
    preheader: "A free, no-obligation valuation.",
    body:
      "Hi [First name],\n\nThe [City] market has shifted over the past few months, and a lot of homeowners are surprised by what their property is worth today.\n\nI'd be glad to prepare a free, no-obligation home valuation for you — based on real recent sales on your street, not an online estimate.\n\nJust reply with your address (or \"yes\") and I'll send it over within a couple of days.\n\nNo strings, no pressure — just good information for when you're ready.\n\n[Your name]\n[Brokerage] · [Phone]",
  },
  {
    name: "Past client check-in (anniversary)",
    subject: "Happy [1-year] in your home, [First name]!",
    preheader: "Just checking in — and a small market update.",
    body:
      "Hi [First name],\n\nHard to believe it's already been [a year] since you got the keys to [Address] — congratulations again!\n\nA quick note in case it's useful: homes in [Neighbourhood] have [appreciated / held steady] since you bought, so your equity position is [stronger than you might think].\n\nIf you ever want to talk through your options — refinancing, an investment property, or just what your home is worth now — I'm always here. And if you know anyone thinking of buying or selling, I'd be grateful for the introduction.\n\nWarmly,\n[Your name]\n[Brokerage] · [Phone]",
  },
];

/** One-click SMS snippets (STOP is appended automatically by the sender). */
export const REALTOR_SMS_PRESETS: RealtorSmsPreset[] = [
  { name: "New listing alert", body: "Hi [First name], it's [Your name] at [Brokerage]. A new [Beds]-bed just listed at [Address] for [Price] — want me to send photos or book a showing?" },
  { name: "Open house reminder", body: "Hi [First name]! Open house this Sat & Sun [Time] at [Address]. Come by — no appointment needed. — [Your name], [Brokerage]" },
  { name: "Price drop", body: "Heads up [First name]: [Address] just dropped to [New price]. Great value for [Neighbourhood]. Want to see it before it's gone? — [Your name]" },
  { name: "Just sold nearby", body: "Hi [First name], a home near you just sold for [Sold price] in [X] days. Curious what yours is worth today? Reply \"value\" and I'll run the numbers. — [Your name]" },
  { name: "Showing follow-up", body: "Hi [First name], thanks for seeing [Address] today! Any questions, or would you like to put together an offer? Happy to help. — [Your name]" },
  { name: "Pre-approval nudge", body: "Hi [First name], before we shop seriously let's get you pre-approved so we can move fast on the right home. Want an intro to a great lender? — [Your name]" },
  { name: "Home value offer", body: "Hi [First name], it's [Your name]. Want a free, no-obligation estimate of your home's value based on real recent sales on your street? Just reply \"yes\"." },
  { name: "Market update teaser", body: "[City] market update for [Month]: avg price [$], homes selling in [#] days. Thinking of a move this year? Let's talk timing. — [Your name], [Brokerage]" },
];
