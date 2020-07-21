$ = jQuery.noConflict();

let tracking_numbers = [];
let tracking_requests_left = 0;

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'), results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function loadLogisticsData(data) {
    let order_id = getParameterByName("tradeId", data.cainiaoUrl);
    let order_id_element = $("span:contains(" + order_id + ")").first();

    if (order_id_element !== null) {
        let order_item_element = order_id_element.closest(".order-item-wraper");
        let order_info_element = order_item_element.find(".order-info");
        let order_status_element = order_item_element.find(".order-status");
        let order_action_element = order_item_element.find(".order-action");
        let order_product_sets_element = order_item_element.find(".product-sets");

        console.log(order_status_element);

        data.tracking.forEach(function (item) {
            let key_description = item.keyDesc;
            let tracking_no = item.mailNo;
            let tracking_url = item.officialUrl;
            let trace_list = item.traceList;

            tracking_numbers.push(tracking_no);

            order_info_element.append(
                `<p class="second-row">
                <span class="info-subtitle">Tracking No.:</span>
                <span class="info-body">${tracking_no}</span>
             </p>`
            );

            order_action_element.append(
                `<button type="button" 
                    class="ui-button ui-button-normal button-logisticsTracking"
                    id="17track-${tracking_no}">
                            17TRACK
                 </button>`
            );

            YQV5.trackSingleF1({
                //Required, Specify the element ID of the floating position.
                YQ_ElementId: `17track-${tracking_no}`,
                //Optional, specify UI language, default language is automatically detected based on the browser settings.
                YQ_Lang: "en",
                //Required, specify the number needed to be tracked.
                YQ_Num: tracking_no
            });

            console.log(`${order_id}:`);
            console.log(`\tTracking No.: ${tracking_no}`)
            console.log(`\tURL: ${tracking_url}`);
            console.log(`\tDescription: ${key_description}`);
            if (trace_list !== undefined) {
                console.log(`\tTracking log:`);

                order_product_sets_element.append(`
                        <span>
                            Tracking log:
                        </span><br/>`
                );

                trace_list.forEach(function (trace_status) {
                    let trace_status_action = trace_status.action.trim();
                    let trace_status_description = trace_status.desc.trim();
                    let trace_status_unix_time = trace_status.eventTime;
                    let trace_status_date = new Date(trace_status_unix_time);
                    let trace_status_date_string = trace_status_date.toLocaleDateString();

                    order_product_sets_element.append(`
                        <span>
                            ${trace_status_date_string} - ${trace_status_description}
                        </span><br/>`
                    );

                    console.log(`\t\t${trace_status_date_string} - ${trace_status_action}`);
                    console.log(`\t\t\t${trace_status_description}`);
                });
            }
        });
    }
    tracking_requests_left -= 1;
    updateAllTrackingNumbersButtons();
}

function updateAllTrackingNumbersButtons() {
    let copy = $("#copy-all-tracking-ids-btn");
    let track = $("#17track-all");
    if (tracking_requests_left > 0) {
        copy.html(`Copy all tracking numbers (${tracking_requests_left} left to load)`);
        copy.attr("disabled", true);
        track.html(`17TRACK All (${tracking_requests_left} left to load)`);
        track.attr("disabled", true);
    } else {
        copy.html(`Copy all tracking numbers`);
        copy.removeAttr("disabled");
        track.html(`17TRACK All`);
        track.removeAttr("disabled");
    }
}

function copyToClipboard(text) {
    let dummy = document.createElement("textarea");
    // to avoid breaking original page when copying more words
    // cant copy when adding below this code
    dummy.style.display = 'none';
    document.body.appendChild(dummy);
    //Be careful if you use textarea. setAttribute('value', value), which works with "input" does not work with "textarea". – Eduard
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
}

let page_size_select = $("#simple-pager-page-size");
for (let i = 40; i <= 200; i += 10) {
    page_size_select.append(`<option value="${i}">${i}/Page</option>`);
}

$("#simple-search").append(`
<div id="all-tracking-numbers-buttons-container"></div>
`);

let all_tracking_numbers_buttons_container = $("#all-tracking-numbers-buttons-container");
all_tracking_numbers_buttons_container.append(`
<button id="copy-all-tracking-ids-btn" 
    class="ui-button ui-button-primary" 
    type="button"
    disabled>
    Copy all tracking numbers
</button>`);

all_tracking_numbers_buttons_container.append(`
<button id="17track-all" 
    class="ui-button ui-button-primary" 
    type="button"
    disabled>
    17TRACK All
</button>`);

// noinspection JSJQueryEfficiency
$("#copy-all-tracking-ids-btn").click(function () {
    if (tracking_requests_left > 0) {
        alert("Please wait for all tracking numbers to be fetched!");
    } else {
        let text = tracking_numbers.join(",");
        copyToClipboard(text);
        alert(`Copied all tracking numbers to clipboard!\nData: ${text}`)
    }
});

// noinspection JSJQueryEfficiency
$("#17track-all").click(function () {
    if (tracking_requests_left > 0) {
        alert("Please wait for all tracking numbers to be fetched!");
    } else {
        let text = tracking_numbers.join(",");

        let win = window.open(`https://t.17track.net/en#nums=${text}`, "_blank");
        if (win) {
            win.focus();
        } else {
            alert('Please allow popups for this feature to work!');
        }
    }
});


$(".button-logisticsTracking").each(function () {
    let ts = Math.round((new Date()).getTime() / 1000);
    let order_id = this.getAttribute("orderid");
    let remote_url = `https://ilogisticsaddress.aliexpress.com/ajax_logistics_track.htm?orderId=${order_id}&_=${ts}&callback=loadLogisticsData`;

    console.log(`Sending request for order id: ${order_id}`);

    let xhr = new XMLHttpRequest();
    xhr.open("GET", remote_url, true);
    xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            eval(xhr.response);
        }
    };
    xhr.send();

    tracking_requests_left += 1;
    updateAllTrackingNumbersButtons();
}).get();