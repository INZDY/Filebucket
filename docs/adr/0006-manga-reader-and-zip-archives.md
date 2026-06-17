# Manga Reader Overlay and Client-Side Archive Decompression

To enable sequential image reading within Filebucket, we decided to build a fullscreen Manga Reader overlay supporting Webtoon (vertical scroll) and Paged (horizontal scroll) layouts. The reader dynamically groups loose images in a folder or, on archive uploads, extracts page images directly in the browser using `jszip` client-side, filtering out hidden system folders/files (e.g. `__MACOSX`, `.DS_Store`) and naturally sorting pages alphabetically using `compareAlphanumeric` to ensure correct sequential page flow.
