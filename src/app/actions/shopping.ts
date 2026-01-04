"use server";

import { revalidatePath } from "next/cache";
import {
  addItemToShoppingList,
  deleteShoppingList,
  deleteShoppingListItem,
  generateShoppingListFromDateRange,
  getShoppingListById,
  getShoppingListsByUserId,
  toggleShoppingListItem,
  updateShoppingListName,
} from "@/lib/services/shopping-list";
import type {
  ShoppingList,
  ShoppingListItem,
  ShoppingListWithItems,
} from "@/types";
import { requireAuth } from "./auth";

export async function getShoppingListsAction(): Promise<ShoppingList[]> {
  const session = await requireAuth();
  return getShoppingListsByUserId(session.user.id);
}

export async function getShoppingListAction(
  listId: string,
): Promise<ShoppingListWithItems | undefined> {
  const session = await requireAuth();
  return getShoppingListById(listId, session.user.id);
}

export async function generateShoppingListAction(data: {
  profileIds: string[];
  dateFrom: Date;
  dateTo: Date;
  name: string;
}): Promise<ShoppingListWithItems> {
  const session = await requireAuth();
  const list = await generateShoppingListFromDateRange(
    session.user.id,
    data.profileIds,
    data.dateFrom,
    data.dateTo,
    data.name,
  );
  revalidatePath("/shopping");
  return list;
}

export async function addShoppingItemAction(
  listId: string,
  data: {
    ingredientId?: string;
    customName?: string;
    amount?: number;
    unit?: string;
    category: string;
  },
): Promise<ShoppingListItem> {
  await requireAuth();
  const item = await addItemToShoppingList(listId, data);
  revalidatePath(`/shopping/${listId}`);
  return item;
}

export async function toggleShoppingItemAction(
  itemId: string,
  field: "checked" | "inPantry",
): Promise<ShoppingListItem> {
  await requireAuth();
  const item = await toggleShoppingListItem(itemId, field);
  revalidatePath("/shopping");
  return item;
}

export async function deleteShoppingItemAction(itemId: string): Promise<void> {
  await requireAuth();
  await deleteShoppingListItem(itemId);
  revalidatePath("/shopping");
}

export async function deleteShoppingListAction(listId: string): Promise<void> {
  const session = await requireAuth();
  await deleteShoppingList(listId, session.user.id);
  revalidatePath("/shopping");
}

export async function updateShoppingListNameAction(
  listId: string,
  name: string,
): Promise<ShoppingList> {
  const session = await requireAuth();
  const list = await updateShoppingListName(listId, session.user.id, name);
  revalidatePath("/shopping");
  return list;
}
