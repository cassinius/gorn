#!/bin/bash

src_loc="$(find src -name "*.ts" | xargs wc -l | tail -n 1 | awk '{print $1;}')"
test_loc="$(find test -name "*.ts" | xargs wc -l | tail -n 1 | awk '{print $1;}')"
sum_loc=$(($src_loc + $test_loc))

echo "--------------------------"
echo "Source        : $src_loc LOC"
echo "Tests         : $test_loc LOC"
echo "--------------------------"
echo "Total         : $sum_loc LOC (Typescript)"
