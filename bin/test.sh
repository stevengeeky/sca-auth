#issue token
#./auth.js issue --scopes '{ "sca": ["user"] }' --sub 'test_service' #--out test.jwt

#./auth.js modscope --username hayashis --set '{"sca": ["user", "admin"]}'
./auth.js modscope --username hayashis --add '{"sca": ["admin", "user"]}'
#./auth.js modscope --username hayashis --del '{"websh": ["deleteme"]}'

#./auth.js modscope --username sundar --add '{"dicom": ["admin"]}'
#./auth.js modscope --username agopu --add '{"dicom": ["admin"]}'
#./auth.js modscope --username jdwest --add '{"dicom": ["admin"]}'

#./auth.js listuser
