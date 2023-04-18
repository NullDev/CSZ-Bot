# At the time of writing only Node.js 18 images are available.
ARG VARIANT=18
FROM mcr.microsoft.com/devcontainers/typescript-node:0-${VARIANT}

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment if you want to install an additional version of node using nvm
# Install Node 20 using nvm and use it by default
ARG EXTRA_NODE_VERSION=20
RUN su node -c "umask 0002 && source ./usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION} && nvm alias default ${EXTRA_NODE_VERSION} && nvm use default"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"
