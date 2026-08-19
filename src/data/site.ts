export const contact = {
  email: process.env.NEXT_PUBLIC_VIRA_EMAIL || process.env.NEXT_PUBLIC_NOMA_EMAIL || "hello@viramedia.co.ke",
  phone: process.env.NEXT_PUBLIC_VIRA_PHONE || process.env.NEXT_PUBLIC_NOMA_PHONE || "+254700000000",
  whatsapp: process.env.NEXT_PUBLIC_VIRA_WHATSAPP || process.env.NEXT_PUBLIC_NOMA_WHATSAPP || "254700000000",
};

export const workItems = [
  { category: "Fashion", title: "Try-On Haul", format: "Creator-led product discovery", hook: "Outfit reveal in the first two seconds", duration: "0:24", type: "UGC", image: "/assets/images/recent-work/fashion-influencer.webp" },
  { category: "Fintech", title: "POV: Payday", format: "Problem-solution creator story", hook: "A relatable payday moment before the product appears", duration: "0:31", type: "POV", image: "/assets/images/recent-work/fintech-influencer.webp" },
  { category: "Food & Bev", title: "Rate My Nyama", format: "Reaction-led food review", hook: "The first bite carries the opening reaction", duration: "0:28", type: "Review", image: "/assets/images/recent-work/food-influencer.webp" },
  { category: "Telco", title: "Data Deni Skit", format: "Relatable comedy skit", hook: "A familiar Kenyan data struggle opens the story", duration: "0:35", type: "Skit", image: "/assets/images/recent-work/telco-influencer.webp" },
];

export const creatorCategories = [
  { title: "Fashion & Lifestyle", detail: "Try-ons · GRWM · retail", image: "/assets/images/creators/lifestyle-female.webp" },
  { title: "Tech & Money", detail: "Apps · explainers · POV", image: "/assets/images/creators/tech-male.webp" },
  { title: "Food & Hospitality", detail: "Reviews · reactions · experiences", image: "/assets/images/creators/food-female.webp" },
  { title: "Comedy & Culture", detail: "Skits · memes · relatable moments", image: "/assets/images/creators/comedy-male.webp" },
];

export const niches = ["Fashion", "Beauty", "Food", "Comedy", "Tech", "Finance", "Travel", "Parenting", "Fitness", "Gaming", "Lifestyle", "Hospitality", "Campus", "Other"];
export const creatorFormats = ["UGC", "Reviews", "Skits", "GRWM", "Explainers", "Vlogs", "Street interviews", "Voiceovers", "Livestreams"];
