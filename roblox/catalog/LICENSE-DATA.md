# Data licence: the vehicle catalogue in this folder

The files in this folder (`CatalogDict.lua`, `Catalog*.lua`, `CarLinks.lua`, `CAR_LINKS.md`) are an **adapted version of the
vehicle-makes-models database**. They are made available under the **Open Database License (ODbL) v1.0**:
https://opendatacommons.org/licenses/odbl/1-0/

- **Source:** vehicle-makes-models, https://github.com/gor3a/vehicle-makes-models (data under ODbL 1.0, see its `LICENSE-DATA`).
  That project compiled its make, model, generation and engine facts from publicly available information on **autoevolution.com**.
- **Changes made for Irbid Drive:**
  - exact duplicate rows removed;
  - values outside plausible ranges flagged as suspect (not changed);
  - unit conversions and heuristic game estimates added (`build_car_database.py`, heuristic v1);
  - rows packed into tab-separated text modules;
  - each game car linked to its nearest catalogue variant.
- **Share-alike:** if you publicly use this adapted database, or a work produced from it, you must offer the adapted database under the
  ODbL as well. This folder is published with the game's source for that reason.
- The game shows the credit in **Settings → © Credits & licences** and at the bottom of every encyclopedia page.

This notice is a summary. The legally binding text is the ODbL 1.0 at the link above.
