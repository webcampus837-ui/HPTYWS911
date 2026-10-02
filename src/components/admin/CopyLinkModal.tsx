import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { copyText, publicUrlFor } from '@/utils/link';

export interface CopyLinkModalProps {
  open: boolean;
  name: string;
  slug: string;
  /** Show the "created successfully" headline instead of the share headline. */
  justCreated?: boolean;
  /** Inactive pages still have a link, but visitors see the unavailable notice. */
  inactive?: boolean;
  onClose: () => void;
}

/**
 * The link-sharing dialog.
 *
 * The URL is always built from `window.location.origin`, so it works unchanged
 * on localhost, a preview deployment and the production domain.
 */
export function CopyLinkModal({
  open,
  name,
  slug,
  justCreated = false,
  inactive = false,
  onClose,
}: CopyLinkModalProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => publicUrlFor(slug), [slug]);

  useEffect(() => {
    if (open) setCopied(false);
  }, [open, url]);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      toast.success('Link copied to clipboard');
      window.setTimeout(() => setCopied(false), 2200);
    } else {
      toast.error('Could not copy automatically — select the link and copy it manually.');
    }
  }, [toast, url]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={justCreated ? 'Birthday created successfully! 🎉' : 'Share this birthday'}
      subtitle={
        name
          ? `${name}'s surprise page is ready to send.`
          : 'This surprise page is ready to send.'
      }
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy Link'}
          </button>
          <a
            className="btn btn--primary"
            href={url}
            target="_blank"
            rel="noreferrer noopener"
          >
            Open Birthday ↗
          </a>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="field">
          <span className="field__label" id="copy-link-label">
            Public link
          </span>
          <div className="flex gap-2">
            <input
              className="input font-mono text-[0.82rem]"
              value={url}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              aria-labelledby="copy-link-label"
            />
          </div>
          <span className="field__hint">
            Anyone with this link reaches the surprise page — they still need the date of birth you
            set to unlock it.
          </span>
        </div>

        {inactive ? (
          <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-[0.82rem] text-amber-100">
            This birthday is currently <strong>Inactive</strong>. Visitors will see “This surprise
            is currently unavailable.” until you switch it back to Active.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
