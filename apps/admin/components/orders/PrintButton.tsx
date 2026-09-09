'use client';

import { useAdmin } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { PrinterIcon } from '@/components/ui/Icons';

/** Opens the browser's print dialogue — the invoice page is styled for A4. */
export function PrintButton() {
  const { t } = useAdmin();
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <PrinterIcon className="text-[1.1em]" />
      {t('invoice.print')}
    </Button>
  );
}
