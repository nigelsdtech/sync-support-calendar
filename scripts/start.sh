#!/bin/sh

. ~/bin/setup_node_env.sh

echo "Calendar ID = $OB_SUPPORT_ROTA_CALENDAR_ID"

node index.js \
	--NODE_APP_INSTANCE="sync-support-calendar";
