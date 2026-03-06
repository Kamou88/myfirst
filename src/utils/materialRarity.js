export const MATERIAL_RARITY_OPTIONS = [
  { label: "一般", value: "一般" },
  { label: "普通", value: "普通" },
  { label: "稀有", value: "稀有" },
  { label: "史诗", value: "史诗" },
  { label: "传说", value: "传说" },
];

export const MATERIAL_RARITY_COLOR = {
  一般: "#d9d9d9",
  普通: "#52c41a",
  稀有: "#1677ff",
  史诗: "#722ed1",
  传说: "#faad14",
};

export function normalizeMaterialRarity(rarity) {
  if (MATERIAL_RARITY_COLOR[rarity]) {
    return rarity;
  }
  return "一般";
}
