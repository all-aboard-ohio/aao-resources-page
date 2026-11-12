# Join Section Photo

Add the approved AAO community photo under `public/images/` using one of these names:

- `join-aao.jpg` (preferred)
- `join-aao.jpeg`
- `join-aao.webp`
- `join-aao.png`

Use a landscape image, ideally at least 1600 pixels wide. Keep important people or
details near the center: the image fills the right half of the section on desktop
and a 16:9 image area below the copy on smaller screens.

Run `npm run build:static` after adding the photo, or restart the development
server. Builds automatically detect the file. A neutral image placeholder is
shown until an approved photo exists. If several formats exist, JPG is preferred.

Update the image description in `JoinAllAboardOhio` to describe the approved photo.
Membership and supporter-list links currently use the AAO Join page; replace the
supporter-list destination when its dedicated URL is ready.

These instructions belong in `docs/`, not `public/`: Vite copies public files into
the deployed site. Keep notes, original captures, source files and caches out of it.