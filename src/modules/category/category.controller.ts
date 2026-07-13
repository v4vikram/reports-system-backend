import { HttpStatus, SuccessMessages } from "../../constants/index.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as categoryService from "./category.service.js";

export const list = asyncHandler(async (_req, res) => {
  const categories = await categoryService.listCategories();
  new ApiResponse(HttpStatus.OK, categories, SuccessMessages.FETCHED).send(res);
});

export const create = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  new ApiResponse(HttpStatus.CREATED, category, SuccessMessages.CREATED).send(res);
});

export const update = asyncHandler<{ id: string }>(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  new ApiResponse(HttpStatus.OK, category, SuccessMessages.UPDATED).send(res);
});

export const remove = asyncHandler<{ id: string }>(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  new ApiResponse(HttpStatus.OK, null, SuccessMessages.DELETED).send(res);
});
