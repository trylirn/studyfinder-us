-- Keep the directory focused on studies that may still accept participants.
-- Locations are removed automatically through locations_nct_id_fkey ON DELETE CASCADE.
DELETE FROM public.studies
WHERE overall_status IN (
  'COMPLETED',
  'TERMINATED',
  'WITHDRAWN',
  'NO_LONGER_AVAILABLE',
  'APPROVED_FOR_MARKETING',
  'AVAILABLE',
  'TEMPORARILY_NOT_AVAILABLE'
);

SELECT public.refresh_directory_counts();
