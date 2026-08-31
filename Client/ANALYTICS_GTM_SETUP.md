# GTM and Meta Pixel setup

The website loads GTM container `GTM-KNCZ6RBC` and emits a `virtual_page_view` dataLayer event once for the initial React route and once for every route change. Meta Pixel is intentionally not embedded in the application.

## GTM configuration required

1. Create a **Custom HTML** tag named `Meta Pixel - Base`. Trigger it on **Initialization - All Pages**. Its exact content is:

```html
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)
}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1109997858131714');
</script>
```

2. Create a **Custom HTML** tag named `Meta Pixel - PageView` with this exact content:

```html
<script>fbq('track', 'PageView');</script>
```

Trigger it with a Custom Event trigger whose event name is `virtual_page_view`.
3. Publish the container. This makes the React event the single source of PageViews and prevents a page-load PageView plus a virtual PageView from firing together.
4. Optionally map the remaining custom dataLayer events (`view_service`, `view_product`, `view_professional`, `search`, `login`, `sign_up`, `start_booking`, `booking_completed`, `add_to_cart`, `begin_checkout`, and `purchase`) to GTM tags/triggers. Map `transaction_id`, `value`, and `currency` from the dataLayer for purchase reporting.

Do not configure a second direct Meta Pixel integration or a GTM All Pages Meta PageView tag.

## Verification

Open Chrome DevTools and confirm a request to `googletagmanager.com`, then inspect `window.dataLayer`. Navigate between real routes such as `/services`, `/products`, `/cart`, and `/professionals`; each navigation should append exactly one `virtual_page_view`. Use Google Tag Assistant to verify `GTM-KNCZ6RBC`, then Meta Pixel Helper to verify pixel `1109997858131714` after the container has been published.
