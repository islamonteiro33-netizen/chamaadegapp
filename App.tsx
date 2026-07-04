
import React,{useEffect,useMemo,useState}from'react';
import{Alert,FlatList,Modal,SafeAreaView,ScrollView,StatusBar as RNStatusBar,StyleSheet,Text,TextInput,TouchableOpacity,Vibration,View}from'react-native';
import{StatusBar}from'expo-status-bar';
import AsyncStorage from'@react-native-async-storage/async-storage';

const API='https://chamabebidas.com.br/api';
const C={bg:'#08090C',panel:'#12151A',panel2:'#1B1E24',line:'#2B3038',text:'#FFF',muted:'#A7ABB4',yellow:'#FFD000',green:'#21D060',red:'#FF3B4E',purple:'#2C1D63',orange:'#FF8A00',blue:'#2F80ED'};

type Order={
  id:any; status:string; customerName?:string; customer_name?:string; customer?:any;
  customerPhone?:string; customer_phone?:string; address?:string; delivery_address?:string;
  total?:number; total_amount?:number; amount?:number; items?:any[];
  securityCode?:string; security_code?:string; pickupCode?:string; pickup_code?:string;
  deliveryCode?:string; delivery_code?:string; paymentMethod?:string; payment_method?:string;
};
type Product={id:any; name:string; price:number; stock:number; category:string; active:boolean};

const DEMO:Order[]=[
  {id:'PED_10193',status:'pending',customerName:'João',customerPhone:'15999999999',address:'Rua Exemplo, 123',total:148.90,paymentMethod:'PIX',securityCode:'7382',items:[{name:'Cerveja lata',qty:10,price:5.5},{name:'Gelo',qty:2,price:10}]},
  {id:'PED_10194',status:'preparing',customerName:'Maria',customerPhone:'15988888888',address:'Centro - Tatuí',total:67.50,paymentMethod:'PIX',securityCode:'2244',items:[{name:'Combo cerveja + gelo',qty:1,price:49.9}]}
];
const DEMO_PRODUCTS:Product[]=[
  {id:1,name:'Heineken 600ml',price:8,stock:24,category:'Cervejas',active:true},
  {id:2,name:'Brahma 600ml',price:6,stock:18,category:'Cervejas',active:true},
  {id:3,name:'Skol 600ml',price:4,stock:22,category:'Cervejas',active:true},
  {id:4,name:'Gelo 5kg',price:10,stock:15,category:'Gelo',active:false}
];

export default function App(){
  const[screen,setScreen]=useState<'login'|'home'|'details'|'products'|'finance'|'profile'>('login');
  const[storeId,setStoreId]=useState('');
  const[storeName,setStoreName]=useState('');
  const[password,setPassword]=useState('');
  const[orders,setOrders]=useState<Order[]>([]);
  const[products,setProducts]=useState<Product[]>(DEMO_PRODUCTS);
  const[selected,setSelected]=useState<Order|null>(null);
  const[demo,setDemo]=useState(false);
  const[filter,setFilter]=useState<'waiting'|'progress'>('waiting');
  const[typed,setTyped]=useState('');
  const[modal,setModal]=useState(false);
  const[pName,setPName]=useState('');
  const[pPrice,setPPrice]=useState('');
  const[pStock,setPStock]=useState('');
  const[pCat,setPCat]=useState('Cervejas');
  const[open,setOpen]=useState(true);
  const[soundOn,setSoundOn]=useState(true);

  useEffect(()=>{boot()},[]);
  useEffect(()=>{
    if(screen==='home'){
      load();
      const timer=setInterval(load,15000);
      return()=>clearInterval(timer);
    }
  },[screen,storeId]);

  async function boot(){
    const id=await AsyncStorage.getItem('storeId');
    const nm=await AsyncStorage.getItem('storeName');
    if(id){
      setStoreId(id);
      setStoreName(nm||`Adega #${id}`);
      setScreen('home');
    }
  }

  async function login(){
    if(!storeId.trim())return Alert.alert('Atenção','Digite o ID da adega.');
    const nm=storeName.trim()||`Adega #${storeId}`;
    await AsyncStorage.setItem('storeId',storeId.trim());
    await AsyncStorage.setItem('storeName',nm);
    setStoreName(nm);
    setScreen('home');
  }

  async function logout(){
    await AsyncStorage.clear();
    setScreen('login');
    setOrders([]);
    setSelected(null);
  }

  async function load(){
    if(!storeId)return;
    try{
      let got:Order[]|null=null;
      for(const url of[`${API}/stores/${storeId}/orders`,`${API}/orders?storeId=${storeId}`,`${API}/orders`]){
        try{
          const r=await fetch(url);
          if(!r.ok)continue;
          const d=await r.json();
          const arr=Array.isArray(d)?d:(d.orders||d.data||d.results);
          if(Array.isArray(arr)){got=arr;break;}
        }catch(e){}
      }
      if(got){
        const oldCount=orders.filter(o=>String(o.status)==='pending').length;
        const newCount=got.filter(o=>String(o.status)==='pending').length;
        if(newCount>oldCount && soundOn)Vibration.vibrate([0,400,150,400,150,700]);
        setOrders(got);
        setDemo(false);
      }else{
        setOrders(DEMO);
        setDemo(true);
      }
    }catch(e){
      setOrders(DEMO);
      setDemo(true);
    }
  }

  function updateLocal(order:Order,status:string){
    const updated={...order,status};
    setOrders(prev=>prev.map(o=>String(o.id)===String(order.id)?updated:o));
    setSelected(updated);
    if(['cancelled','picked_up','delivered','completed','finished'].includes(status)){
      setTimeout(()=>setScreen('home'),250);
    }
  }

  async function setStatus(order:Order,status:string){
    updateLocal(order,status);
    if(!demo){
      fetch(`${API}/orders/${order.id}/status`,{
        method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({status,storeId})
      }).catch(()=>{});
    }
  }

  function openDetails(order:Order){
    setSelected(order);
    setTyped('');
    setScreen('details');
  }

  function security(order:Order|null){
    if(!order)return '----';
    return String(order.securityCode||order.security_code||order.pickupCode||order.pickup_code||order.deliveryCode||order.delivery_code||'----');
  }

  function release(order:Order){
    if(typed.trim()!==security(order)){
      Alert.alert('Código incorreto','Digite o número de segurança informado pelo entregador.');
      return;
    }
    setStatus(order,'picked_up');
  }

  function customer(order:Order|null){
    if(!order)return 'Cliente';
    return order.customerName||order.customer_name||order.customer?.name||'Cliente';
  }
  function phone(order:Order|null){return order?.customerPhone||order?.customer_phone||order?.customer?.phone||'';}
  function addr(order:Order|null){return order?.address||order?.delivery_address||order?.customer?.address||'Endereço não informado';}
  function total(order:Order|null){return Number(order?.total||order?.total_amount||order?.amount||0);}
  function pay(order:Order|null){return order?.paymentMethod||order?.payment_method||'PIX';}
  function itemName(it:any){return String(it?.name||it?.title||it?.product_name||it?.product?.name||'Produto');}
  function itemQty(it:any){return Number(it?.qty||it?.quantity||1);}
  function itemPrice(it:any){return Number(it?.price||it?.unit_price||it?.product?.price||0);}

  const visible=useMemo(()=>{
    return orders.filter(o=>{
      const st=String(o.status||'');
      if(['delivered','cancelled','finished','completed','picked_up'].includes(st))return false;
      if(filter==='waiting')return st==='pending';
      return ['accepted','preparing','ready','calling_driver','driver_accepted'].includes(st);
    });
  },[orders,filter]);

  const waiting=orders.filter(o=>String(o.status)==='pending').length;
  const progress=orders.filter(o=>['accepted','preparing','ready','calling_driver','driver_accepted'].includes(String(o.status))).length;
  const finished=orders.filter(o=>['delivered','completed','picked_up'].includes(String(o.status))).length;
  const revenue=orders.filter(o=>String(o.status)!=='cancelled').reduce((s,o)=>s+total(o),0);
  const platformFee=revenue*0.10;
  const deliveryFee=orders.length*4.5;
  const payout=Math.max(0,revenue-platformFee-deliveryFee);

  function addProduct(){
    if(!pName.trim()||!pPrice.trim())return Alert.alert('Produto','Digite nome e preço.');
    const prod:Product={id:Date.now(),name:pName.trim(),price:Number(pPrice.replace(',','.'))||0,stock:Number(pStock)||0,category:pCat,active:true};
    setProducts(prev=>[prod,...prev]);
    setPName('');setPPrice('');setPStock('');setPCat('Cervejas');setModal(false);
  }

  function removeProduct(prod:Product){
    Alert.alert('Excluir produto',`Deseja excluir ${prod.name}?`,[
      {text:'Cancelar'},
      {text:'Excluir',style:'destructive',onPress:()=>setProducts(prev=>prev.filter(p=>p.id!==prod.id))}
    ]);
  }

  if(screen==='login')return(
    <SafeAreaView style={s.bg}>
      <StatusBar style="light"/>
      <RNStatusBar barStyle="light-content" backgroundColor={C.bg}/>
      <ScrollView contentContainerStyle={s.login}>
        <View style={s.logo}><Text style={{fontSize:42}}>🏪</Text></View>
        <Text style={s.title}>Chama Adega</Text>
        <Text style={s.subCenter}>Pedidos em tempo real</Text>
        <Input ph="ID da adega" v={storeId} set={setStoreId}/>
        <Input ph="Nome da adega" v={storeName} set={setStoreName}/>
        <TextInput style={s.input} placeholder="Senha" placeholderTextColor={C.muted} value={password} onChangeText={setPassword} secureTextEntry/>
        <Button title="ENTRAR" onPress={login}/>
      </ScrollView>
    </SafeAreaView>
  );

  if(screen==='details'){
    if(!selected)return <SafeAreaView style={s.bg}><Header title="Pedido" back={()=>setScreen('home')}/><Empty title="Pedido não encontrado" text="Volte para a lista."/></SafeAreaView>;
    const st=String(selected.status||'');
    return(
      <SafeAreaView style={s.bg}>
        <Header title={`Pedido #${selected.id}`} back={()=>setScreen('home')}/>
        <ScrollView contentContainerStyle={{padding:16,paddingBottom:100}}>
          <View style={s.panel}>
            <View style={s.row}><Text style={s.big}>{customer(selected)}</Text><Text style={s.badge}>{st}</Text></View>
            <Text style={s.sub}>{phone(selected)}</Text>
            <Text style={s.sub}>{addr(selected)}</Text>
            <Text style={s.total}>R$ {total(selected).toFixed(2)}</Text>
            <Text style={s.sub}>Pagamento: {pay(selected)}</Text>
          </View>
          <View style={s.codeBox}>
            <Text style={s.sub}>Número de segurança</Text>
            <Text style={s.code}>{security(selected)}</Text>
            <Text style={s.sub}>Confira esse número para liberar a retirada.</Text>
          </View>
          <View style={s.panel}>
            <Text style={s.pname}>Itens</Text>
            {(selected.items||[]).length===0?<Text style={s.sub}>Itens não enviados pela API.</Text>:(selected.items||[]).map((it:any,i:number)=>(
              <View key={i} style={s.item}><Text style={s.white}>{itemQty(it)}x {itemName(it)}</Text><Text style={s.sub}>R$ {itemPrice(it).toFixed(2)}</Text></View>
            ))}
          </View>
          <View style={s.panel}>
            <Text style={s.pname}>Ação do pedido</Text>
            {st==='pending'&&(
              <View style={s.actions}>
                <TouchableOpacity style={s.reject} onPress={()=>setStatus(selected,'cancelled')}><Text style={s.white}>REJEITAR</Text></TouchableOpacity>
                <TouchableOpacity style={s.accept} onPress={()=>setStatus(selected,'accepted')}><Text style={s.acceptText}>ACEITAR</Text></TouchableOpacity>
              </View>
            )}
            {st==='accepted'&&<Button title="COMEÇAR PREPARO" onPress={()=>setStatus(selected,'preparing')}/>}
            {st==='preparing'&&<Button title="PEDIDO PRONTO" onPress={()=>setStatus(selected,'ready')}/>}
            {st==='ready'&&<Button title="CHAMAR ENTREGADOR" onPress={()=>setStatus(selected,'calling_driver')}/>}
            {['calling_driver','driver_accepted'].includes(st)&&(
              <View>
                <TextInput style={s.input} placeholder="Código informado pelo entregador" placeholderTextColor={C.muted} value={typed} onChangeText={setTyped} keyboardType="numeric"/>
                <Button title="LIBERAR RETIRADA" onPress={()=>release(selected)}/>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if(screen==='products')return(
    <SafeAreaView style={s.bg}>
      <Header title="Produtos" back={()=>setScreen('home')}/>
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:95}}>
        <View style={s.searchBox}><Text style={s.big}>Produtos e estoque</Text><Text style={s.sub}>Controle o que aparece no app do cliente.</Text></View>
        <Button title="+ ADICIONAR PRODUTO" onPress={()=>setModal(true)}/>
        {products.map(p=>(
          <View key={p.id} style={s.product}>
            <View style={s.prodIcon}><Text style={{fontSize:32}}>🍺</Text></View>
            <View style={{flex:1}}>
              <Text style={s.pname}>{p.name}</Text>
              <Text style={s.sub}>{p.category} • Estoque: {p.stock}</Text>
              <Text style={s.priceYellow}>R$ {p.price.toFixed(2)}</Text>
            </View>
            <View style={{gap:8,alignItems:'flex-end'}}>
              <TouchableOpacity style={p.active?s.on:s.off} onPress={()=>setProducts(prev=>prev.map(x=>x.id===p.id?{...x,active:!x.active}:x))}>
                <Text style={s.onText}>{p.active?'ON':'OFF'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>removeProduct(p)}><Text style={s.delete}>Excluir</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      <ProductModal visible={modal} close={()=>setModal(false)} name={pName} setName={setPName} price={pPrice} setPrice={setPPrice} stock={pStock} setStock={setPStock} cat={pCat} setCat={setPCat} save={addProduct}/>
      <Nav screen={screen} setScreen={setScreen}/>
    </SafeAreaView>
  );

  if(screen==='finance')return(
    <SafeAreaView style={s.bg}>
      <Header title="Financeiro" back={()=>setScreen('home')}/>
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:95}}>
        <View style={s.panel}>
          <Text style={s.sub}>Faturamento hoje</Text>
          <Text style={s.money}>R$ {revenue.toFixed(2)}</Text>
          <Text style={s.sub}>{orders.length} pedidos registrados</Text>
        </View>
        <View style={s.panel}>
          <Line l="Pedidos concluídos" v={`${finished}`}/>
          <Line l="Taxa da plataforma (10%)" v={`-R$ ${platformFee.toFixed(2)}`}/>
          <Line l="Taxa de entrega" v={`-R$ ${deliveryFee.toFixed(2)}`}/>
          <Line l="Repasse líquido" v={`R$ ${payout.toFixed(2)}`} green/>
          <Button title="SOLICITAR SAQUE"/>
        </View>
      </ScrollView>
      <Nav screen={screen} setScreen={setScreen}/>
    </SafeAreaView>
  );

  if(screen==='profile')return(
    <SafeAreaView style={s.bg}>
      <Header title="Perfil" back={()=>setScreen('home')}/>
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:95}}>
        <View style={s.profileCard}>
          <View style={s.logoSmall}><Text style={{fontSize:30}}>🏪</Text></View>
          <Text style={s.big}>{storeName||`Adega #${storeId}`}</Text>
          <Text style={s.sub}>ID: {storeId}</Text>
        </View>
        <MenuLine t="Status da adega" v={open?'Aberta':'Fechada'} onPress={()=>setOpen(!open)}/>
        <MenuLine t="Som de novos pedidos" v={soundOn?'Ativo':'Desligado'} onPress={()=>setSoundOn(!soundOn)}/>
        <MenuLine t="Telefone" v="(15) 99845-1234"/>
        <MenuLine t="Endereço" v="Rua das Flores, 123"/>
        <MenuLine t="Horário de funcionamento" v="08:00 - 00:00"/>
        <MenuLine t="Impressora" v="Não conectada"/>
        <TouchableOpacity style={s.logout} onPress={logout}><Text style={s.logoutText}>SAIR DA CONTA</Text></TouchableOpacity>
      </ScrollView>
      <Nav screen={screen} setScreen={setScreen}/>
    </SafeAreaView>
  );

  return(
    <SafeAreaView style={s.bg}>
      <View style={s.top}>
        <View>
          <Text style={s.hello}>{storeName||`Adega #${storeId}`}</Text>
          <Text style={demo?s.warn:s.green}>{demo?'Modo demonstração':'Conectado à API'}</Text>
        </View>
        <TouchableOpacity onPress={()=>setScreen('profile')}><Text style={s.gear}>⚙</Text></TouchableOpacity>
      </View>
      <View style={s.statusTabs}>
        <TouchableOpacity style={[s.statusTab,filter==='waiting'&&s.statusOn]} onPress={()=>setFilter('waiting')}>
          <Text style={filter==='waiting'?s.tabTextOn:s.tabText}>Em espera ({waiting})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.statusTab,filter==='progress'&&s.statusOn]} onPress={()=>setFilter('progress')}>
          <Text style={filter==='progress'?s.tabTextOn:s.tabText}>Em percurso ({progress})</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={visible}
        keyExtractor={(i)=>String(i.id)}
        contentContainerStyle={{padding:16,paddingBottom:95}}
        ListEmptyComponent={<Empty title={filter==='waiting'?'Nenhum pedido em espera':'Nenhum pedido em percurso'} text="Pedidos finalizados somem desta tela."/>}
        renderItem={({item})=><OrderCard order={item} customer={customer} addr={addr} total={total} pay={pay} code={security} open={()=>openDetails(item)} setStatus={setStatus}/>}
      />
      <Nav screen={screen} setScreen={setScreen}/>
    </SafeAreaView>
  );
}

function OrderCard({order,customer,addr,total,pay,code,open,setStatus}:any){
  const st=String(order.status||'');
  return(
    <View style={s.order}>
      <TouchableOpacity onPress={open}>
        <View style={s.row}><Text style={s.orderTitle}>Pedido #{order.id}</Text><Text style={s.badge}>{st}</Text></View>
        <Text style={s.pname}>{customer(order)}</Text>
        <Text style={s.sub}>{addr(order)}</Text>
        <View style={s.infoRow}><Text style={s.price}>R$ {total(order).toFixed(2)}</Text><Text style={s.pay}>{pay(order)}</Text></View>
        <View style={s.codeMini}><Text style={s.sub}>Código</Text><Text style={s.codeSmall}>{code(order)}</Text></View>
      </TouchableOpacity>
      {st==='pending'&&(
        <View style={s.actions}>
          <TouchableOpacity style={s.reject} onPress={()=>setStatus(order,'cancelled')}><Text style={s.white}>REJEITAR</Text></TouchableOpacity>
          <TouchableOpacity style={s.accept} onPress={()=>setStatus(order,'accepted')}><Text style={s.acceptText}>ACEITAR</Text></TouchableOpacity>
        </View>
      )}
      {st!=='pending'&&<Button title="ABRIR PEDIDO" onPress={open}/>}
    </View>
  );
}

function ProductModal({visible,close,name,setName,price,setPrice,stock,setStock,cat,setCat,save}:any){
  return(
    <Modal transparent visible={visible} animationType="slide">
      <View style={s.modalBg}>
        <View style={s.modal}>
          <Text style={s.big}>Novo produto</Text>
          <Input ph="Nome do produto" v={name} set={setName}/>
          <Input ph="Preço" v={price} set={setPrice}/>
          <Input ph="Estoque" v={stock} set={setStock}/>
          <Text style={s.sub}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['Cervejas','Destilados','Gelo','Energéticos','Refrigerantes','Combos'].map((c:string)=>(
              <TouchableOpacity key={c} onPress={()=>setCat(c)} style={[s.catChip,cat===c&&s.catChipOn]}>
                <Text style={cat===c?s.catTextOn:s.catText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Button title="SALVAR PRODUTO" onPress={save}/>
          <TouchableOpacity style={s.cancelBtn} onPress={close}><Text style={s.white}>CANCELAR</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Empty({title,text}:any){return <View style={s.empty}><Text style={s.big}>{title}</Text><Text style={s.sub}>{text}</Text></View>;}
function Input({ph,v,set}:any){return <TextInput style={s.input} placeholder={ph} placeholderTextColor={C.muted} value={v} onChangeText={set}/>;}
function Button({title,onPress}:any){return <TouchableOpacity style={s.btn} onPress={onPress}><Text style={s.btnText}>{title}</Text></TouchableOpacity>;}
function Header({title,back}:any){return <View style={s.header}><TouchableOpacity onPress={back}><Text style={s.back}>‹</Text></TouchableOpacity><Text style={s.htitle}>{title}</Text><Text style={s.back}> </Text></View>;}
function Line({l,v,green}:any){return <View style={s.line}><Text style={s.sub}>{l}</Text><Text style={green?s.lineGreen:s.white}>{v}</Text></View>;}
function MenuLine({t,v,onPress}:any){return <TouchableOpacity style={s.menuLine} onPress={onPress}><Text style={s.white}>{t}</Text><Text style={s.sub}>{v} ›</Text></TouchableOpacity>;}
function Nav({screen,setScreen}:any){
  return(
    <View style={s.nav}>
      <TouchableOpacity onPress={()=>setScreen('home')}><Text style={screen==='home'?s.navA:s.navT}>📦{'\n'}Pedidos</Text></TouchableOpacity>
      <TouchableOpacity onPress={()=>setScreen('products')}><Text style={screen==='products'?s.navA:s.navT}>🧃{'\n'}Produtos</Text></TouchableOpacity>
      <TouchableOpacity onPress={()=>setScreen('finance')}><Text style={screen==='finance'?s.navA:s.navT}>💰{'\n'}Financeiro</Text></TouchableOpacity>
      <TouchableOpacity onPress={()=>setScreen('profile')}><Text style={screen==='profile'?s.navA:s.navT}>⚙{'\n'}Perfil</Text></TouchableOpacity>
    </View>
  );
}

const s=StyleSheet.create({
bg:{flex:1,backgroundColor:C.bg},
login:{flexGrow:1,justifyContent:'center',padding:24},
logo:{width:92,height:92,borderRadius:46,backgroundColor:C.yellow,alignItems:'center',justifyContent:'center',alignSelf:'center',marginBottom:22},
title:{color:C.text,fontSize:31,fontWeight:'900',textAlign:'center'},
subCenter:{color:C.muted,textAlign:'center',fontWeight:'700',marginBottom:18},
sub:{color:C.muted,fontWeight:'700',marginTop:4},
input:{backgroundColor:C.panel2,color:C.text,borderRadius:12,padding:16,marginTop:12,borderWidth:1,borderColor:C.line},
btn:{backgroundColor:C.yellow,borderRadius:12,padding:16,alignItems:'center',marginTop:14},
btnText:{color:'#111',fontWeight:'900'},
top:{paddingTop:45,paddingHorizontal:18,paddingBottom:14,backgroundColor:C.bg,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
hello:{color:C.text,fontSize:22,fontWeight:'900'},
green:{color:C.green,fontWeight:'900'},
warn:{color:C.orange,fontWeight:'900'},
gear:{color:C.yellow,fontSize:26},
statusTabs:{flexDirection:'row',gap:10,paddingHorizontal:16,paddingBottom:12},
statusTab:{flex:1,backgroundColor:C.panel,borderRadius:14,padding:14,alignItems:'center',borderWidth:1,borderColor:C.line},
statusOn:{backgroundColor:C.yellow},
tabText:{color:C.text,fontWeight:'900'},
tabTextOn:{color:'#111',fontWeight:'900'},
order:{backgroundColor:C.panel,borderRadius:20,padding:16,marginBottom:14,borderWidth:1,borderColor:C.line},
row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
orderTitle:{color:C.text,fontSize:20,fontWeight:'900'},
badge:{color:C.yellow,fontWeight:'900'},
pname:{color:C.text,fontSize:17,fontWeight:'900',marginTop:10},
infoRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:10},
price:{color:C.text,fontWeight:'900',fontSize:26},
pay:{color:C.green,fontWeight:'900'},
codeMini:{backgroundColor:C.panel2,borderRadius:14,padding:12,marginTop:14,borderWidth:1,borderColor:C.line,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
codeSmall:{color:C.yellow,fontSize:24,fontWeight:'900',letterSpacing:4},
codeBox:{backgroundColor:C.panel2,borderRadius:16,padding:14,marginBottom:14,borderWidth:1,borderColor:C.line},
code:{color:C.yellow,fontSize:34,fontWeight:'900',letterSpacing:8,marginTop:4},
item:{flexDirection:'row',justifyContent:'space-between',paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.line},
white:{color:C.text,fontWeight:'900'},
actions:{flexDirection:'row',gap:10,marginTop:14},
reject:{flex:1,backgroundColor:C.red,borderRadius:12,padding:15,alignItems:'center'},
accept:{flex:1,backgroundColor:C.yellow,borderRadius:12,padding:15,alignItems:'center'},
acceptText:{color:'#111',fontWeight:'900'},
empty:{backgroundColor:C.panel,borderRadius:20,padding:24,alignItems:'center',borderWidth:1,borderColor:C.line},
big:{color:C.text,fontSize:24,fontWeight:'900'},
total:{color:C.text,fontSize:28,fontWeight:'900',marginTop:12},
panel:{backgroundColor:C.panel,borderRadius:20,padding:18,marginBottom:14,borderWidth:1,borderColor:C.line},
header:{height:68,backgroundColor:C.bg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18},
back:{color:C.text,fontSize:38},
htitle:{color:C.text,fontSize:18,fontWeight:'900'},
nav:{position:'absolute',left:0,right:0,bottom:0,height:66,backgroundColor:'rgba(16,16,18,.98)',flexDirection:'row',justifyContent:'space-around',alignItems:'center',borderTopWidth:1,borderTopColor:C.line},
navT:{color:C.muted,textAlign:'center',fontSize:11,fontWeight:'800'},
navA:{color:C.yellow,textAlign:'center',fontSize:11,fontWeight:'900'},
searchBox:{backgroundColor:C.panel,borderRadius:20,padding:18,borderWidth:1,borderColor:C.line,marginBottom:14},
product:{backgroundColor:C.panel,borderRadius:18,padding:14,borderWidth:1,borderColor:C.line,marginTop:12,flexDirection:'row',alignItems:'center',gap:12},
prodIcon:{width:56,height:56,borderRadius:14,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
priceYellow:{color:C.yellow,fontWeight:'900',fontSize:16,marginTop:4},
on:{backgroundColor:C.green,borderRadius:999,paddingHorizontal:12,paddingVertical:8},
off:{backgroundColor:C.line,borderRadius:999,paddingHorizontal:12,paddingVertical:8},
onText:{color:'#111',fontWeight:'900'},
delete:{color:C.red,fontWeight:'900'},
money:{color:C.text,fontSize:34,fontWeight:'900',marginTop:8},
line:{flexDirection:'row',justifyContent:'space-between',paddingVertical:12,borderBottomWidth:1,borderBottomColor:C.line},
lineGreen:{color:C.green,fontWeight:'900'},
profileCard:{backgroundColor:C.panel,borderRadius:20,padding:18,alignItems:'center',borderWidth:1,borderColor:C.line,marginBottom:14},
logoSmall:{width:70,height:70,borderRadius:35,backgroundColor:C.yellow,alignItems:'center',justifyContent:'center',marginBottom:10},
menuLine:{backgroundColor:C.panel,borderRadius:16,padding:16,borderWidth:1,borderColor:C.line,marginBottom:10,flexDirection:'row',justifyContent:'space-between'},
logout:{borderWidth:1,borderColor:C.red,borderRadius:12,padding:16,alignItems:'center',marginTop:10},
logoutText:{color:C.red,fontWeight:'900'},
modalBg:{flex:1,backgroundColor:'rgba(0,0,0,.55)',justifyContent:'flex-end'},
modal:{backgroundColor:C.panel,borderTopLeftRadius:22,borderTopRightRadius:22,padding:22,borderTopWidth:1,borderColor:C.line},
catChip:{backgroundColor:C.panel2,borderRadius:999,paddingHorizontal:14,paddingVertical:10,marginRight:8,marginTop:10,borderWidth:1,borderColor:C.line},
catChipOn:{backgroundColor:C.yellow},
catText:{color:C.text,fontWeight:'900'},
catTextOn:{color:'#111',fontWeight:'900'},
cancelBtn:{backgroundColor:C.panel2,borderRadius:12,padding:16,alignItems:'center',marginTop:10,borderWidth:1,borderColor:C.line}
});
