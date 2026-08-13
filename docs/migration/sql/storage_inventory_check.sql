select
  id as bucket_id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('avatars', 'project-assets')
order by id;

select
  bucket_id,
  count(*)::bigint as objects,
  sum(coalesce((metadata ->> 'size')::bigint, 0))::bigint as total_size_bytes
from storage.objects
where bucket_id in ('avatars', 'project-assets')
group by bucket_id
order by bucket_id;

select
  bucket_id,
  name as object_name,
  coalesce((metadata ->> 'size')::bigint, 0) as size_bytes,
  metadata ->> 'mimetype' as content_type
from storage.objects
where bucket_id in ('avatars', 'project-assets')
order by bucket_id, name;
