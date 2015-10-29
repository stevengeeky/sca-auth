

#issue token
./signjwt.js --scopes '
{
    "common": ["user"]
}' --sub 'test_service'
