const LUMENAUT = 'GCCD6AJOYZCUAQLX32ZJF2MKFFAUJ53PVCFQI3RHWKL3V47QYE2BNAUT';

const notifier = opt=>{
    let msg = $(`<div class="notify ${opt.type}"><span>${opt.text}</span></div>`);
    let disappear = ()=>{
        let n = 0;
        $(msg).on('transitionend', ()=> 
            ++n==2 ? $(msg).remove() : $(msg).addClass('squash'));
        $(msg).removeClass('slide-from-right');
    };
    $(msg).on('click', ()=>disappear());
    if (opt.delay)
        setTimeout(()=>disappear(), opt.delay*1000);
    $('#notify-panel').append($(msg));
    setTimeout(()=>$(msg).addClass('slide-from-right'), 100);
}

const _e = async handler=>{
    try {
        $('body').addClass('loading');
        await handler();
    } catch (e) {
        console.log('Exception:', e);
        notifier({text: e.message, type: 'error', delay: 5});
    }
    $('body').removeClass('loading');
};

const form = {}, form_ids = ['account_id', 'inflation_dest', 'xdr', 'tx_id'];
form_ids.forEach(id=>Object.defineProperty(form, id, {
    get: function(){ return $('#' + id).val(); },
    set: function(value){ $('#' + id).val(value); },
}));

// Button handlers
const btn_set_inflation_dest = async ()=>
    form.inflation_dest = LUMENAUT;
    
const btn_get_account_id = async ()=>
    form.account_id = await get_account_id();

const btn_build_xdr = async ()=>
    form.xdr = await build_xdr(form.account_id, form.inflation_dest);

const btn_submit_xdr = async ()=>{
    form.tx_id = await submit_transaction(form.xdr);
    notifier({text: 'Success!', type: 'success', delay: 5});
};

const btn_view_xdr = ()=>{
    if (!form.xdr)
        throw new Error('XDR is not yet built');
    let params = {
        input: form.xdr,
        type: 'TransactionEnvelope',
        network: 'public',
    };
    let url = 'https://www.stellar.org/laboratory/#xdr-viewer?'+$.param(params);
    window.open(url, '_blank');
};

const btn_view_tx = ()=>{
    if (!form.tx_id)
        throw new Error('Transaction ID is not yet available');
    window.open('https://stellarchain.io/tx/'+form.tx_id, '_blank');
};
