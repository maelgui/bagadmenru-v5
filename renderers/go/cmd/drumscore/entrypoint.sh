#!/bin/sh
set -e

# Drum Score Editor reads its EULA acceptance and licence from Java
# Preferences. On Linux these live under ~/.java/.userPrefs as per-node
# prefs.xml files. The batch "createPDF" CLI only runs when BOTH the EULA is
# accepted AND a valid Studio Edition licence is present; otherwise the command
# is silently ignored (Community mode).
#
# We write both at container start:
#   - the EULA acceptance is hard-coded (accepting it is a prerequisite for any
#     batch use),
#   - the licence comes from the environment (DSE_LICENSE_VERSION /
#     DSE_LICENSE_CONTENT) and is NEVER baked into the image. Without it the
#     renderer starts but createPDF yields no PDF (expected until a licence is
#     provisioned).

PREFS_DIR="${HOME}/.java/.userPrefs/org/whiteware/DrumScoreEditor"
mkdir -p "${PREFS_DIR}/Legal" "${PREFS_DIR}/License"

cat > "${PREFS_DIR}/Legal/prefs.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE map SYSTEM "http://java.sun.com/dtd/preferences.dtd">
<map MAP_XML_VERSION="1.0">
  <entry key="EULAAccepted" value="true"/>
  <entry key="EULAAcceptedDate" value="2026-01-01"/>
  <entry key="EULAVersion" value="1"/>
</map>
EOF

if [ -n "${DSE_LICENSE_CONTENT}" ] && [ -n "${DSE_LICENSE_VERSION}" ]; then
  cat > "${PREFS_DIR}/License/prefs.xml" <<EOF
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE map SYSTEM "http://java.sun.com/dtd/preferences.dtd">
<map MAP_XML_VERSION="1.0">
  <entry key="LicenseVersion" value="${DSE_LICENSE_VERSION}"/>
  <entry key="LicenseContent" value="${DSE_LICENSE_CONTENT}"/>
</map>
EOF
  echo "DrumScore licence injected (version ${DSE_LICENSE_VERSION})."
else
  echo "WARNING: no DrumScore licence provided (DSE_LICENSE_VERSION/DSE_LICENSE_CONTENT unset); createPDF will produce no output."
fi

exec /app/drumscore-renderer
