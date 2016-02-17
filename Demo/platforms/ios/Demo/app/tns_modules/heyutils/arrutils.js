/**
 * Created by zhs007 on 2015/1/8.
 */

function hasChild(arr, child) {
    for (var i = 0; i < arr.length; ++i) {
        if (arr[i] == child) {
            return true;
        }
    }

    return false;
}

exports.hasChild = hasChild;