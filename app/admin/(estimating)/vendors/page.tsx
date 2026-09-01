import Link from 'next/link';
import type { Metadata } from 'next';
import { listVendors } from '@/lib/estimating/queries';
import { VENDOR_CATEGORY_LABELS, type VendorCategory } from '@/lib/estimating/constants';
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { DeleteVendorButton, VendorForm } from '@/components/admin/catalog/CatalogForms';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Vendors & subs' };
export const dynamic = 'force-dynamic';

export default async function VendorsPage({ searchParams }: { searchParams: { edit?: string } }) {
  let vendors;
  try {
    vendors = await listVendors({ includeInactive: true });
  } catch (error) {
    return (
      <>
        <PageHeader title="Vendors & subcontractors" />
        <SetupNotice error={describeThrown(error, 'listVendors')} />
      </>
    );
  }

  const editing = vendors.find((vendor) => vendor.id === searchParams.edit);

  return (
    <>
      <PageHeader
        title="Vendors & subcontractors"
        subtitle="One directory. Suppliers and subcontractors are independent flags on the same record."
      />

      <Panel className="mb-6">
        <PanelHeader title={editing ? `Edit ${editing.company_name}` : 'Add a vendor'} />
        <PanelBody>
          <VendorForm key={editing?.id ?? 'new'} vendor={editing} cancelHref="/admin/vendors" />
        </PanelBody>
      </Panel>

      <Panel>
        {vendors.length === 0 ? (
          <EmptyState
            title="No vendors yet"
            description="Add controls, electrical, insulation, TAB, rigging and equipment suppliers."
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH>Company</TH>
                  <TH>Category</TH>
                  <TH>Role</TH>
                  <TH>Contact</TH>
                  <TH>Email</TH>
                  <TH>Phone</TH>
                  <TH align="right">Actions</TH>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-white/[0.02]">
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{vendor.company_name}</span>
                        {!vendor.is_active && <Badge tone="muted">Inactive</Badge>}
                      </div>
                      {vendor.city && (
                        <div className="text-[11px] text-steel-500">
                          {[vendor.city, vendor.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </TD>
                    <TD className="text-xs text-steel-300">
                      {vendor.category
                        ? (VENDOR_CATEGORY_LABELS[vendor.category as VendorCategory] ??
                          vendor.category)
                        : '—'}
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {vendor.is_supplier && <Badge>Supplier</Badge>}
                        {vendor.is_subcontractor && <Badge tone="info">Sub</Badge>}
                      </div>
                    </TD>
                    <TD className="text-steel-300">{vendor.contact_name ?? '—'}</TD>
                    <TD className="max-w-[180px] truncate">
                      {vendor.email ? (
                        <a
                          href={`mailto:${vendor.email}`}
                          className="text-ember-300 hover:text-ember-200"
                        >
                          {vendor.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-steel-300">{vendor.phone ?? '—'}</TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/vendors?edit=${vendor.id}`}
                          className="inline-flex h-8 items-center rounded px-2 text-xs font-semibold text-steel-300 hover:bg-white/10 hover:text-white"
                        >
                          Edit
                        </Link>
                        <DeleteVendorButton id={vendor.id} name={vendor.company_name} />
                      </div>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
