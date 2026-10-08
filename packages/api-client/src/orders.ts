// ============================================================
// Orders (invoices) & customers API
// ============================================================

import type {
  CreateCustomerInput,
  CreateInvoiceInput,
  CreatePaymentInput,
  Customer,
  Invoice,
  Page,
  Payment,
} from "@my-store/shared-types";
import { API_ROUTES } from "@my-store/shared-utils";
import { apiGet, apiPatch, apiPost } from "./client";

export function listInvoices(query?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<Page<Invoice>> {
  return apiGet(API_ROUTES.invoices, {
    status: query?.status,
    page: query?.page,
    pageSize: query?.pageSize,
  });
}

export function getInvoice(id: string): Promise<Invoice> {
  return apiGet(`${API_ROUTES.invoices}/${id}`);
}

export function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  return apiPost(API_ROUTES.invoices, input);
}

export function updateInvoiceStatus(
  id: string,
  status: string,
): Promise<Invoice> {
  return apiPatch(`${API_ROUTES.invoices}/${id}`, { status });
}

export function addInvoicePayment(
  id: string,
  input: CreatePaymentInput,
): Promise<Payment> {
  return apiPost(`${API_ROUTES.invoices}/${id}/payments`, input);
}

export function listCustomers(query?: { search?: string }): Promise<Page<Customer>> {
  return apiGet(API_ROUTES.customers, { search: query?.search });
}

export function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  return apiPost(API_ROUTES.customers, input);
}
