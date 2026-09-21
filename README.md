# BodyMaps CT Viewer

A browser-based CT and organ-segmentation viewer built for a BodyMaps/JHU research-lab demonstration. It uses NiiVue/WebGL to render a CT study and nine aligned binary organ masks without a server-side imaging stack.

## Features

- Automatically loads the BDMAP_00000338 CT plus aorta, gall bladder, bilateral kidneys, liver, pancreas, postcava, spleen, and stomach masks.
- Axial, coronal, sagittal, 3D, and multiplanar grid views.
- Segment visibility, per-segment color, opacity, show/hide-all controls.
- CT soft tissue, bone, lung, and brain presets plus manual window/level.
- Crosshair readout with HU and the foreground organ name; mouse-wheel slice scrolling.
- Drag/drop and file-picker support for local `.nii` and `.nii.gz` studies (first selected file is CT, subsequent files are treated as overlays).

## Screenshot

_Screenshot placeholder: run the application and capture the multiplanar view for your lab documentation._

## Run locally

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. For a production check:

```powershell
npm run build
npm run preview
```

## Deploy to GitHub Pages

`vite.config.js` uses `base: './'`, so static asset URLs resolve under a repository sub-path. Build with `npm run build`, publish the contents of `dist/` to GitHub Pages (for example with a GitHub Actions Pages workflow), and keep `public/data/` in the repository so the NIfTI files deploy with the site.

## Data source and credits

The included demonstration data is `BDMAP_00000338`, copied from the supplied local BDMAP case. NiiVue provides the in-browser NIfTI/WebGL renderer. The workflow and segment-panel design are inspired by [3D Slicer](https://www.slicer.org/).

## Known limitations

This is a demo viewer, not a clinical workstation: it does not provide DICOM ingestion, measurements, segmentation editing, PACS connectivity, persistence, or medical-device validation. Large studies depend on available browser memory and GPU/WebGL2 support. Local-file overlays are assumed to already be aligned to the CT grid.
