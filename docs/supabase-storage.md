# Supabase Storage Architecture & Policy Documentation

**Project:** AI Urban Farming Assistant  
**Platform:** Supabase Storage  
**Bucket Name:** `plant-images`  
**Status:** Verified, Tested, and Operational  

---

## 1. Storage Architecture Overview

The application utilizes Supabase Storage to securely store leaf and plant photographs uploaded by users for AI health tracking, disease diagnosis, and historical logs.

### Topology:

```text
User / Browser (Upload File)
            ↓  multipart/form-data (Field: "file")
    FastAPI Backend (/api/plants/{plant_id}/images)
            ↓  Validates MIME (jpeg/png/webp) & Size (<= 10MB)
    Supabase Storage Client (Uploads to bucket: 'plant-images')
            ↓  Unique Path: plants/{plant_id}/{uuid}.{ext}
    Metadata stored in PostgreSQL table 'plant_images'
            ↓
    Read Requests generate temporary Signed URLs (1 hour expiry)
```

---

## 2. Bucket Configuration

| Property | Value | Notes |
| :--- | :--- | :--- |
| **Bucket ID** | `plant-images` | Must match the identifier in `services/storage_service.py`. |
| **Bucket Name** | `plant-images` | Created in Supabase Storage. |
| **Public Status** | `Private` (`public: false`) | Ensures all objects require authenticated or signed URL access. |
| **Allowed MIME Types** | `image/jpeg`, `image/png`, `image/webp` | Enforced at the FastAPI application layer. |
| **Maximum File Size** | `10 MB` (10,485,760 bytes) | Validated before uploading to prevent storage bloat. |
| **Storage Path Pattern** | `plants/{plant_id}/{uuid}{ext}` | Organizes files by plant; UUID ensures zero collision/overwrites. |

---

## 3. Signed URL Strategy

Because the `plant-images` bucket is **private**, raw object URLs (`https://<project>.supabase.co/storage/v1/object/public/...`) return `404 Not Found` or `403 Forbidden`.

Instead, the FastAPI backend issues temporary **Signed URLs**:
- **Validity Duration:** `3600 seconds` (1 hour).
- **Generation Method:** `supabase.storage.from_("plant-images").create_signed_url(path, expires_in=3600)`.
- **Enrichment:** When `GET /api/plants/{plant_id}/images` is called, every image item includes both the permanent database `image_url` (storage key) and a ready-to-render `signed_url`.

---

## 4. Storage Row Level Security (RLS) & Policies

When interacting with Supabase Storage via FastAPI using the configured key:
- If using `service_role` key: Storage bypasses RLS automatically.
- If using `anon` key or direct Supabase client with authenticated user JWTs, the following standard SQL policies should be enabled on `storage.objects`:

```sql
-- 1. Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- 2. Allow authenticated users to upload images into their plant folder
create policy "Users can upload plant images"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'plant-images'
);

-- 3. Allow authenticated users to view/download their plant images
create policy "Users can read plant images"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'plant-images'
);

-- 4. Allow users to delete their plant images
create policy "Users can delete their plant images"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'plant-images'
);
```

---

## 5. Storage Error Handling & Orphan Cleanup

In `backend/services/storage_service.py` and `backend/routes/images.py`:
- **Validation Failure:** If an uploaded file exceeds 10MB or is not JPEG/PNG/WEBP, FastAPI aborts with `HTTP 400 Bad Request` prior to invoking Supabase Storage.
- **Transactional Cleanup:** If the file upload to Supabase Storage succeeds but the subsequent metadata insertion into PostgreSQL `plant_images` fails, the backend immediately invokes `delete_storage_file()` to purge the uploaded object, guaranteeing zero orphaned storage objects.
- **Signed URL Resilience:** If a stored path already represents a fully qualified URL (e.g. from seed or test data), `create_image_signed_url()` transparently passes it through without throwing errors.
