
/* 
    数据转义 {{user.name}}  ==> 名字
*/  
const Datezhuan = {
    getVlue(node, key, data, type){ // (节点， 转义的属性，总数据，内容类型)
        node[type] = Datezhuan.setvalue(key, data)
    },
    setvalue(key, data){ // (属性， 总数据)  return 返回 val值
        //传入 value  或  user.name
        var arr = key.split('.') // [value]  [user, name]
        for(var i = 0; i<arr.length;i++){
            /*  
                data:{
                    value: '默认',
                    user:{
                        name:'名字'
                    }
                } 

                key = user.name
                arr =  [user, name]
                
                i=0
                arr[0] = user
                data = data[arr[0]] == { name:名字}

                i=1
                data = { name:名字}
                arr[1] = name
                data = data[arr[1]] == 名字

                data = 名字
             */
            data = data[arr[i]]
        }
        return data
    },
    inputValue(data, key, val){
        var arr = key.split('.');
        if(arr.length >1){
            for(var i=0; i< arr.length-1;i++){
                data = data[arr[i]]
            }
            data[arr[arr.length-1]] =val
        }else{
            data[arr[0]] = val
        }
    }
}


// 创建节点仓库存储 回调函数cbk  和 执行 cbk函数
class Dep{
    constructor(){
        this.arrFn = [];
    }
    addFn(obj){
        this.arrFn.push(obj)
    }
    runFn(){
        this.arrFn.forEach(item =>{
            item.cbkfn()
        })
    }
}
Dep.target=null;
var dep = new Dep();


/* 第三阶段 DOMwatch */
class DomWartch{
    constructor(data, key, cbk){
        Dep.target = this;
        this.data = data;
        this.key = key;
        this.cbk = cbk;
        this.init()
    }
    init(){
        var val =Datezhuan.setvalue(this.key, this.data);
        return val
    }
    // 回调发布者
    cbkfn(){
        var val = this.init(); // 获取当前节点的劫持内容
        this.cbk(val) // 传递给我的回调函数
    }
}


/* 第二阶段 数据劫持 */
class DateWatch{
    constructor(data){
        // 判断data有没有 或者是不是 object类型
        if(!data || typeof data !== 'object'){
            return
        }
        this.data = data
        this.init()
    }

    init(){
        // [value, user]
        Object.keys(this.data).forEach(key =>{
            /*
                this.data ={value: '默认',user:{name:'徐国鑫'}}
                key = value
                this.data[key] ='默认'
            */
            this.dateWatch(this.data, key, this.data[key])
        })
    }
    dateWatch(data, key, val){
        new DateWatch(data[key]) // 实现递归 逐级劫持
        Object.defineProperty(data, key, {// （添加的对象 data， 添加的属性名称key，添加的属性值val）
            get(){
                if(Dep.target){
                    dep.addFn(Dep.target)
                }
                Dep.target=null
                return val
            },
            set(newval){
                if(val === newval){ // 如果修改后的纸箱等直接结束
                    return
                }
                val = newval
                dep.runFn()
                new DateWatch(val)
            }
        })
    }
}







/* 第一阶段 解析html */
class Mvvm{
    constructor({el, data}){
        this.$el = document.querySelector(el);
        this.data = data;
        /* 总数据劫持 */
        new DateWatch(this.data)
        this.createsuipian()
    }
    createsuipian(){
        this.supianDom = document.createDocumentFragment();
        while(this.$el.firstChild){
            this.supianDom.appendChild(this.$el.firstChild)
        }
        this.renderDate(this.supianDom);
        // 从新添加文本流
        this.$el.appendChild(this.supianDom)
    }

    /* 解析DOM 内value数据 */
    renderDate(node){
        
        if(node.nodeType === 3){ // 文本节点
            if(node.nodeValue.indexOf('{{') > -1 && node.nodeValue.indexOf('}}') > -1){
                /* Date 数据转义 */
                // ['',list.name}}]    list.name}}      [list.name, '']
                var x = node.nodeValue.split('{{')[1].split('}}')[0]; // list.name
                x && Datezhuan.getVlue(node, x, this.data, 'nodeValue')
                // 利用发布订阅者给每一个节点绑定一个回调函数
                x && new DomWartch(this.data, x, (res)=>{ // 订阅者 （总数据，当前属性，（返回值val））
                    node.nodeValue = res
                })
            }
        }

        if(node.nodeType === 1){ // 标签节点
           var attr = node.attributes['v-model'];
           // 判断当前节点是否存在 v-model 自定义属性
           if(attr){// 是
                var x = attr.nodeValue; // value
                x && Datezhuan.getVlue(node, x, this.data, 'value')
                node.oninput=(e)=>{
                    var val = e.target.value;
                    /*
                        this.data 总数据
                        x key值
                        val 当前输入框内容
                     */
                    Datezhuan.inputValue(this.data, x,val) // 由于this.data劫持  只需要修改元数据内容就可以实现新页面渲染
                }
           }
        }

        if(node.childNodes && node.childNodes.length > 0){
            Array.from(node.childNodes).forEach( item => {
                this.renderDate(item)
            })
        }
    }

}