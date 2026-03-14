export const searchableSelectProps = {
  showSearch: true,
  optionFilterProp: "searchText",
  filterOption: (input, option) =>
    String(option?.searchText || option?.value || "")
      .toLowerCase()
      .includes(String(input || "").trim().toLowerCase()),
};
