import { describe, expect, it } from "vitest";
import {
  hasMealListFilters,
  mealListSearch,
  parseMealListQuery,
} from "@/lib/meal-list-query";

describe("parseMealListQuery", () => {
  it("defaults to an unfiltered first page", () => {
    expect(parseMealListQuery({})).toEqual({
      q: "",
      mealTypeIds: [],
      tagIds: [],
      flags: [],
      page: 1,
    });
  });

  it("reads lists, drops unknown flags and bad pages", () => {
    const query = parseMealListQuery({
      q: "  zupa ",
      types: "a,b,,a",
      tags: ["t1", "t2"],
      flags: "vegan,quick,bogus",
      page: "-3",
    });
    expect(query).toEqual({
      q: "zupa",
      mealTypeIds: ["a", "b"],
      tagIds: ["t1"],
      flags: ["vegan", "quick"],
      page: 1,
    });
    expect(parseMealListQuery({ page: "3" }).page).toBe(3);
  });

  it("round-trips through the query string", () => {
    const query = parseMealListQuery({
      q: "jajko 2%",
      types: "a",
      flags: "vegetarian",
      page: "2",
    });
    const search = mealListSearch(query);
    const params = Object.fromEntries(new URLSearchParams(search.slice(1)));
    expect(parseMealListQuery(params)).toEqual(query);
    expect(mealListSearch(parseMealListQuery({}))).toBe("");
  });

  it("tells whether any filter is set", () => {
    expect(hasMealListFilters(parseMealListQuery({ page: "2" }))).toBe(false);
    expect(hasMealListFilters(parseMealListQuery({ flags: "quick" }))).toBe(
      true,
    );
  });
});
