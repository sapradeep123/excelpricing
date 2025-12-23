import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Product } from "@shared/schema";

// ============================================
// REST HOOKS
// ============================================

// GET /api/products
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await fetch(api.products.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      return await res.json();
    },
  });
}

// GET /api/categories
export function useCategories() {
  return useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return await res.json();
    },
  });
}

// GET /api/products/category/:category
export function useProductsByCategory(category: string | null) {
  return useQuery({
    queryKey: ["/api/products/category", category],
    queryFn: async () => {
      if (!category) return [];
      const res = await fetch(`/api/products/category/${category}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      return await res.json();
    },
    enabled: !!category,
  });
}

// GET /api/products/:id
export function useProduct(id: number) {
  return useQuery({
    queryKey: [api.products.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.products.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product");
      return await res.json();
    },
    enabled: !!id,
  });
}
