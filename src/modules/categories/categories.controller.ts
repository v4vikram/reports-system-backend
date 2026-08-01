import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import * as categoriesService from "./categories.service.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.types.js";

export async function list(_req: Request, res: Response) {
  const categories = await categoriesService.listCategories();
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, categories, "Categories fetched"));
}

export async function create(req: Request, res: Response) {
  const category = await categoriesService.createCategory(req.body as CreateCategoryInput);
  res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, category, "Category created"));
}

export async function update(req: Request, res: Response) {
  const category = await categoriesService.updateCategory(
    req.params.id as string,
    req.body as UpdateCategoryInput
  );
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, category, "Category updated"));
}

export async function remove(req: Request, res: Response) {
  await categoriesService.deleteCategory(req.params.id as string);
  res.status(HttpStatus.NO_CONTENT).send();
}
