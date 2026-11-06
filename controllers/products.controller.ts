import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ErrorObject } from 'ajv';
import { type ProductsBody, validateProductsBody } from '../schemas/products.schema';

/** Types json() only at compile time, so tests still check the body shape at runtime. */
export interface ProductsResponse extends APIResponse {
  json(): Promise<ProductsBody>;
}

export class ProductsController {
  constructor(private readonly request: APIRequestContext) {}

  getProductsByBrand(brand: string): Promise<ProductsResponse> {
    return this.getProducts({ brand });
  }

  getProductByName(query: { name: string; lang: string; brand: string }): Promise<ProductsResponse> {
    return this.getProducts(query);
  }

  /** Returns the JSON Schema violations in a GET /products body, or an empty array when it is valid. */
  getSchemaErrors(body: ProductsBody): ErrorObject[] {
    validateProductsBody(body);
    return validateProductsBody.errors ?? [];
  }

  // Returns the response unparsed: a Cloudflare 403 is HTML, so tests must check the status before json().
  private getProducts(params: Record<string, string>): Promise<ProductsResponse> {
    return this.request.get('/products', { params });
  }
}
