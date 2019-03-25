docker build -t perfsonar/sca-auth:dev ..
if [ ! $? -eq 0 ]; then
    echo "failed to build"
    exit
fi
docker tag perfsonar/sca-auth:dev perfsonar/sca-auth:dev
docker push perfsonar/sca-auth:dev
