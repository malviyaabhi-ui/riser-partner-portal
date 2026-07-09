import { getSessionContext } from "@/lib/queries";
import ProductEditor from "@/components/ProductEditor";

export default async function EditProduct({ params }) {
  const { supabase } = await getSessionContext();
  const { data: product } = await supabase
    .from("products").select("*").eq("id", params.id).single();
  if (!product) return <p className="text-muted">Product not found.</p>;

  return (
    <div>
      <a href="/admin/products" className="text-teal-dark text-[12.5px] font-semibold">← Back to products</a>
      <div className="mt-3 mb-5">
        <h1 className="font-display font-bold text-[22px]">Edit — {product.name}</h1>
        <p className="text-muted text-[13px] mt-0.5">
          This information is shown to partners on the product detail page.
        </p>
      </div>
      <ProductEditor product={product} />
    </div>
  );
}
