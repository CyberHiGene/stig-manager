function addPackageAdmin() {
	var assetFields = Ext.data.Record.create([
		{
			name: 'assetId',
			type: 'number'
		}, {
			name: 'name',
			type: 'string'
		}, {
			name: 'ip',
			type: 'string'
		}
	]);
	var assetStore = new Ext.data.JsonStore({
		url: `${STIGMAN.Env.apiBase}/assets?elevate=${curUser.canAdmin}`,
		fields: assetFields,
		autoLoad: true,
		root: '',
		sortInfo: {
			field: 'name',
			direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
		},
		idProperty: 'assetId'
	});

	var stigFields = Ext.data.Record.create([
		{	name:'benchmarkId',
			type: 'string'
		},{
			name:'title',
			type: 'string'
		},{
			name: 'users' 
		},{
			name: 'icon'
		}
	]);
	var stigStore = new Ext.data.JsonStore({
		listeners: {
			load: function () {
				let one = 1
			}
		},
		url: `${STIGMAN.Env.apiBase}/stigs`,
		fields: stigFields,
		autoLoad: true,
		root: '',
		sortInfo: {
			field: 'title',
			direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
		},
		idProperty: 'benchmarkId'
	});

	var packageFields = Ext.data.Record.create([
		{
			name: 'packageId',
			type: 'number'
		}, {
			name: 'name',
			type: 'string'
		}, {
			name: 'emassId',
			type: 'string'
		}, {
			name: 'reqRar',
			type: 'number'
		}, {
			name: 'pocName',
			type: 'string'
		}, {
			name: 'pocEmail',
			type: 'string'
		}, {
			name: 'pocPhone',
			type: 'string'
		}, {
			name: 'repositoryName',
			type: 'string'
		}
	]);

	var packageStore = new Ext.data.JsonStore({
		proxy: new Ext.data.HttpProxy({
			url: `${STIGMAN.Env.apiBase}/packages`,
			method: 'GET'
		}),
		root: '',
		fields: packageFields,
		totalProperty: 'records',
		idProperty: 'packageId',
		sortInfo: {
			field: 'name',
			direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
		},
		listeners: {
			load: function (store, records) {
				store.isLoaded = true,
					Ext.getCmp('packageGrid-totalText').setText(records.length + ' records');
				packageGrid.getSelectionModel().selectFirstRow();
			},
			remove: function (store, record, index) {
				Ext.getCmp('packageGrid-totalText').setText(store.getCount() + ' records');
			}
		}
	});

	var packageGrid = new Ext.grid.EditorGridPanel({
		id: 'packageGrid',
		region: 'west',
		split: true,
		title: 'Package List',
		width: 400,
		store: packageStore,
		stripeRows: true,
		sm: new Ext.grid.RowSelectionModel({
			singleSelect: true,
			listeners: {
				rowselect: function (sm, index, record) {
					assetStore.parentName = record.data.name
					assetStore.load({
						params: {
							packageId: record.data.packageId,
							projection: ['adminStats'],
							elevate: curUser.canAdmin
						}
					})
				}
			}
		}),
		columns: [{
			header: "Package",
			width: 300,
			dataIndex: 'name',
			sortable: true
		}, {
			header: "eMASS ID",
			width: 100,
			dataIndex: 'emassId',
			sortable: true
		}
		],
		view: new Ext.grid.GridView({
			forceFit: true,
			// These listeners keep the grid in the same scroll position after the store is reloaded
			listeners: {
				beforerefresh: function (v) {
					v.scrollTop = v.scroller.dom.scrollTop;
					v.scrollHeight = v.scroller.dom.scrollHeight;
				},
				refresh: function (v) {
					setTimeout(function () {
						v.scroller.dom.scrollTop = v.scrollTop + (v.scrollTop == 0 ? 0 : v.scroller.dom.scrollHeight - v.scrollHeight);
					}, 100);
				}
			},
			deferEmptyText: false
		}),
		listeners: {
			rowdblclick: {
				fn: function (grid, rowIndex, e) {
					var r = grid.getStore().getAt(rowIndex);
					Ext.getBody().mask('Getting properties of ' + r.get('name') + '...');
					showPackageProps(r.get('packageId'));
				}
			}
		},
		tbar: [{
			iconCls: 'icon-add',
			tooltip: 'Create',
			handler: function () {
				Ext.getBody().mask('Loading form...');
				showPackageProps(0);
			}
		}, '-', {
			iconCls: 'icon-edit',
			tooltip: 'Edit',
			handler: function () {
				var r = packageGrid.getSelectionModel().getSelected();
				Ext.getBody().mask('Getting properties of ' + r.get('name') + '...');
				showPackageProps(r.get('packageId'));
			}
		}, '->', {
			ref: '../removeBtn',
			iconCls: 'icon-del',
			tooltip: 'Delete',
			disabled: !(curUser.canAdmin),
			handler: function () {
				try {
					var confirmStr = "Deleteing this package will <b>permanently remove</b> all data associated with the package. This includes all the package's existing STIG assessments. The deleted data <b>cannot be recovered</b>.<br><br>Do you wish to delete the package?";
					Ext.Msg.confirm("Confirm", confirmStr, async function (btn, text) {
						if (btn == 'yes') {
							var package = packageGrid.getSelectionModel().getSelected();
							let result = await Ext.Ajax.requestPromise({
								url: `${STIGMAN.Env.apiBase}/packages/${package.data.packageId}?elevate=true`,
								method: 'DELETE'
							})
							packageStore.remove(package);
						}
					})
				}
				catch (e) {
					alert(e.message)
				}
			}
		}],
		bbar: new Ext.Toolbar({
			items: [
				{
					xtype: 'tbbutton',
					id: 'packageGrid-csvBtn',
					iconCls: 'icon-save',
					tooltip: 'Download this table\'s data as Comma Separated Values (CSV)',
					width: 20,
					handler: function (btn) {
						var ourStore = assetGrid.getStore();
						var lo = ourStore.lastOptions;
						window.location = ourStore.url + '?csv=1&xaction=read';
					}
				}, {
					xtype: 'tbfill'
				}, {
					xtype: 'tbseparator'
				}, {
					xtype: 'tbtext',
					id: 'packageGrid-totalText',
					text: '0 records',
					width: 80
				}]
		}),
		loadMask: true
	});

	var assetFields = Ext.data.Record.create([
		{
			name: 'assetId',
			type: 'number'
		}, {
			name: 'name',
			type: 'string'
		}, {
			name: 'ip',
			type: 'string',
			sortType: sortIpAddress
		}, {
			name: 'dept.name',
			type: 'string',
			mapping: 'dept.name'
		}, {
			name: 'stigCount',
			type: 'integer',
			mapping: 'adminStats.stigCount'
		}, {
			name: 'stigUnassignedCount',
			type: 'integer',
			convert: (v, r) => r.adminStats.stigCount - r.adminStats.stigAssignedCount
		}, {
			name: 'nonnetwork',
			type: 'boolean'
		}
	]);

	var assetStore = new Ext.data.JsonStore({
		proxy: new Ext.data.HttpProxy({
			url: `${STIGMAN.Env.apiBase}/assets`,
			method: 'GET'
		}),
		root: '',
		fields: assetFields,
		totalProperty: 'records',
		isLoaded: false, // custom property
		idProperty: 'assetId',
		sortInfo: {
			field: 'name',
			direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
		},
		listeners: {
			load: function (store, records) {
				store.isLoaded = true,
				Ext.getCmp(`assetGrid-package-totalText`).setText(records.length + ' records');
				assetGrid.getSelectionModel().selectFirstRow();
				assetGrid.setTitle(`Assets in Package "${store.parentName}"`)
			},
			remove: function (store, record, index) {
				Ext.getCmp(`assetGrid-package-totalText`).setText(store.getCount() + ' records');
			}
		}
	});

	var assetGrid = new Ext.grid.GridPanel({
		region: 'center',
		title: 'Asset administration',
		id: `assetGrid-package`,
		store: assetStore,
		stripeRows: true,
		sm: new Ext.grid.RowSelectionModel({
			singleSelect: true,
			listeners: {
				selectionchange: function (sm) {
					Ext.getCmp(`assetGrid-package-modifyBtn`).setDisabled(!sm.hasSelection());
					Ext.getCmp(`assetGrid-package-deleteBtn`).setDisabled(!sm.hasSelection());
				}
			}
		}),
		columns: [{
			header: "Asset",
			width: 15,
			dataIndex: 'name',
			sortable: true
		}, {
			header: "Department",
			width: 15,
			dataIndex: 'dept.name',
			sortable: true
		}, {
			header: "IP",
			width: 10,
			dataIndex: 'ip',
			sortable: true
		}, {
			header: "Not Networked",
			width: 5,
			dataIndex: 'nonnetwork',
			align: "center",
			tooltip: "Is the asset connected to a network",
			renderer: function (value, metaData, record, rowIndex, colIndex, store) {
				return value ? 'X' : '';
			},
			sortable: true
		}, {
			header: "STIGs",
			width: 5,
			dataIndex: 'stigCount',
			align: "center",
			tooltip: "Total STIGs Assigned",
			sortable: true
		}, {
			header: "Unassigned",
			width: 7,
			dataIndex: 'stigUnassignedCount',
			align: "center",
			tooltip: "STIGs Missing User Assignments",
			sortable: true
		}],
		view: new Ext.grid.GridView({
			forceFit: true,
			// These listeners keep the grid in the same scroll position after the store is reloaded
			listeners: {
				beforerefresh: function (v) {
					v.scrollTop = v.scroller.dom.scrollTop;
					v.scrollHeight = v.scroller.dom.scrollHeight;
				},
				refresh: function (v) {
					setTimeout(function () {
						v.scroller.dom.scrollTop = v.scrollTop + (v.scrollTop == 0 ? 0 : v.scroller.dom.scrollHeight - v.scrollHeight);
					}, 100);
				}
			},
			deferEmptyText: false
		}),
		listeners: {
			rowdblclick: {
				fn: function (grid, rowIndex, e) {
					var r = grid.getStore().getAt(rowIndex);
					Ext.getBody().mask('Getting properties of ' + r.get('name') + '...');
					showAssetProps(r.get('assetId'));
				}
			}
		},
		tbar: [
			{
				iconCls: 'icon-add',
				text: 'New asset',
				handler: function () {
					Ext.getBody().mask('Loading form...');
					showAssetProps();
				}
			}
			, '-'
			, {
				ref: '../removeBtn',
				iconCls: 'icon-del',
				id: `assetGrid-package-deleteBtn`,
				text: 'Delete asset',
				disabled: true,
				handler: function () {
					try {
						var confirmStr = "Deleteing this asset will <b>permanently remove</b> all data associated with the asset. This includes all the asset's existing STIG assessments. The deleted data <b>cannot be recovered</b>.<br><br>Do you wish to delete the asset?";
						Ext.Msg.confirm("Confirm", confirmStr, async function (btn, text) {
							if (btn == 'yes') {
								let asset = assetGrid.getSelectionModel().getSelected()
								let result = await Ext.Ajax.requestPromise({
									url: `${STIGMAN.Env.apiBase}/assets/${asset.data.assetId}`,
									method: 'DELETE'
								})
								assetStore.remove(asset)
							}
						})
					}
					catch (e) {
						alert(e.message)
					}
				}
			}
			, '-'
			, {
				iconCls: 'sm-asset-icon',
				disabled: true,
				id: `assetGrid-package-modifyBtn`,
				text: 'Modify asset properties',
				handler: function () {
					var r = assetGrid.getSelectionModel().getSelected();
					Ext.getBody().mask('Getting properties of ' + r.get('name') + '...');
					showAssetProps(r.get('assetId'));
				}
			}
		],
		bbar: new Ext.Toolbar({
			items: [
				{
					xtype: 'tbbutton',
					iconCls: 'icon-refresh',
					tooltip: 'Reload this grid',
					width: 20,
					handler: function (btn) {
						assetGrid.getStore().reload();
					}
				}, {
					xtype: 'tbseparator'
				}, {
					xtype: 'tbbutton',
					id: `assetGrid-package-csvBtn`,
					iconCls: 'icon-save',
					tooltip: 'Download this table\'s data as Comma Separated Values (CSV)',
					width: 20,
					handler: function (btn) {
						var ourStore = assetGrid.getStore();
						var lo = ourStore.lastOptions;
						window.location = ourStore.url + '?csv=1&xaction=read';
					}
				}, {
					xtype: 'tbfill'
				}, {
					xtype: 'tbseparator'
				}, {
					xtype: 'tbtext',
					id: `assetGrid-package-totalText`,
					text: '0 records',
					width: 80
				}]
		}),
		width: '50%',
		loadMask: true
	});


	async function showPackageProps(packageId) {
		let apiPackage
		/******************************************************/
		// Assets
		/******************************************************/
		var assetSm = new Ext.grid.CheckboxSelectionModel({
			checkOnly: true,
			onRefresh: function () {
				var ds = this.grid.store, index;
				var s = this.getSelections();
				for (var i = 0, len = s.length; i < len; i++) {
					var r = s[i];
					if ((index = ds.indexOfId(r.id)) != -1) {
						this.grid.view.addRowClass(index, this.grid.view.selectedRowClass);
					}
				}
			}
		});
		var assetGrid = new Ext.grid.GridPanel({
			title: 'Asset assignments',
			hideHeaders: false,
			anchor: "100% -150",
			id: 'packages-assetGrid',
			hideLabel: true,
			isFormField: true,
			store: assetStore,
			columns: [
				assetSm,
				{
					header: "Asset",
					width: 95,
					dataIndex: 'name',
					sortable: true
				},
				{
					header: "IP",
					width: 95,
					dataIndex: 'ip',
					sortable: true
				}
			],
			viewConfig: {
				forceFit: true
			},
			sm: assetSm,
			setValue: function (assets) {
				var selRecords = []
				assets.forEach(asset => {
					let record = assetStore.getById(asset.assetId)
					selRecords.push(record)
				})
				assetSm.selectRecords(selRecords);
			},
			getValue: function () {
				return JSON.parse(encodeSm(assetSm, 'assetId'))
			},
			markInvalid: function () { },
			clearInvalid: function () { },
			validate: function () { return true },
			isValid: function () { return true; },
			getName: function () { return this.name },
			fieldLabel: 'Assets',
			tbar: new Ext.Toolbar({
				items: [
					{
						// START Filter control
						xtype: 'buttongroup',
						title: 'Filtering',
						items: [
							{
								xtype: 'trigger',
								fieldLabel: 'Filter',
								triggerClass: 'x-form-clear-trigger',
								onTriggerClick: function () {
									this.triggerBlur();
									this.blur();
									this.setValue('');
									filterAssetStore();
								},
								id: 'packages-assetGrid-filterField',
								width: 140,
								submitValue: false,
								enableKeyEvents: true,
								emptyText: 'Enter an asset filter...',
								listeners: {
									keyup: function (field, e) {
										filterAssetStore();
										return false;
									}
								}
							}, {
								xtype: 'tbseparator'
							}, {
								xtype: 'tbbutton',
								icon: 'img/tick_white.png',
								tooltip: 'Show assignments only',
								id: 'packages-assetGrid-filterButton',
								toggleGroup: 'asset-selector',
								enableToggle: true,
								allowDepress: true,
								toggleHandler: function (btn, state) {
									filterAssetStore();
								}
							}]
					}]
			}),
			name: 'assets'
		});

		/******************************************************/
		// Form panel
		/******************************************************/
		var packagePropsFormPanel = new Ext.form.FormPanel({
			baseCls: 'x-plain',
			labelWidth: 95,
			monitorValid: true,
			items: [
				{ // start fieldset config
					xtype: 'fieldset',
					title: 'Package Information',
					autoHeight: true,
					items: [
						{ // start asset column config
							layout: 'column',
							baseCls: 'x-plain',
							items: [ // start asset column items
								{ // start column #1 config
									columnWidth: .5,
									layout: 'form',
									baseCls: 'x-plain',
									items: [
										{
											xtype: 'textfield',
											fieldLabel: 'Package Name',
											anchor: '-20',
											emptyText: 'Enter package name...',
											allowBlank: false,
											name: 'name'
										}
										, {
											xtype: 'textfield',
											fieldLabel: 'eMASS ID',
											anchor: '-20',
											emptyText: 'Enter eMASS ID...',
											allowBlank: true,
											name: 'emassId'
										}
										, {
											xtype: 'checkbox',
											name: 'reqRar',
											boxLabel: 'Requires RAR'
										}
									] // end column #1 items
								},// end column #1 config
								{ // column #2 config
									columnWidth: .5,
									layout: 'form',
									baseCls: 'x-plain',
									items: [
										{
											xtype: 'textfield',
											fieldLabel: 'POC Name',
											anchor: '-20',
											emptyText: 'Enter POC name...',
											allowBlank: false,
											name: 'pocName'
										},
										{
											xtype: 'textfield',
											fieldLabel: 'POC Email',
											anchor: '-20',
											emptyText: 'Enter POC email...',
											allowBlank: true,
											name: 'pocEmail'
										},
										{
											xtype: 'textfield',
											fieldLabel: 'POC Phone',
											anchor: '-20',
											emptyText: 'Enter POC phone...',
											allowBlank: true,
											name: 'pocPhone'
										}
									]// end column #2 items
								} // end column #2 config
							]// end asset column items
						} // end asset column config
					] // end fieldset items
				} // end fieldset config
				, assetGrid
			], // end form items
			buttons: [{
				text: 'Cancel',
				handler: function () {
					appwindow.close();
				}
			}, {
				text: 'Save',
				formBind: true,
				id: 'submit-button',
				handler: async function () {
					try {
						if (packagePropsFormPanel.getForm().isValid()) {
							let values = packagePropsFormPanel.getForm().getFieldValues(false, true) // dirtyOnly=false, getDisabled=true
							// change "assets" to "assetIds"
							delete Object.assign(values, { ['assetIds']: values['assets'] })['assets']
							let url, method
							if (packageId) {
								url = `${STIGMAN.Env.apiBase}/packages/${packageId}?elevate=${curUser.canAdmin}`
								method = 'PUT'
							}
							else {
								url = `${STIGMAN.Env.apiBase}/packages?elevate=${curUser.canAdmin}`
								method = 'POST'
							}
							let result = await Ext.Ajax.requestPromise({
								url: url,
								method: method,
								headers: { 'Content-Type': 'application/json;charset=utf-8' },
								jsonData: values
							})
							apiPackage = JSON.parse(result.response.responseText)

							//TODO: This is expensive, should update the specific record instead of reloading entire set
							Ext.getCmp('packageGrid').getView().holdPosition = true
							Ext.getCmp('packageGrid').getStore().reload()
							appwindow.close()
						}
					}
					catch (e) {
						alert(e.message)
					}
				},
				handlerOriginal: function () {
					packagePropsFormPanel.getForm().submit({
						submitEmptyText: false,
						params: {
							id: packageid,
							assets: encodeSm(assetSm, 'assetId'),
							req: 'update'
						},
						waitMsg: 'Saving changes...',
						success: function (f, a) {
							Ext.getCmp('packageGrid').getView().holdPosition = true; //sets variable used in override in varsUtils.js
							Ext.getCmp('packageGrid').getStore().reload();
							Ext.Msg.alert('Success', 'Package ID ' + a.result.id + ' has been updated.');
							appwindow.close();
						},
						failure: function (form, action) {
							if (action.failureType === Ext.form.Action.CONNECT_FAILURE) {
								Ext.Msg.alert('Error',
									'Status:' + action.response.status + ': ' +
									action.response.statusText);
							}
							if (action.failureType === Ext.form.Action.SERVER_INVALID) {
								// server responded with success = false
								Ext.Msg.alert('Invalid', action.result.errorStr);
							}
						}
					});
				}
			}]
		});

		/******************************************************/
		// Form window
		/******************************************************/
		var appwindow = new Ext.Window({
			id: 'packagePropsWindow',
			title: packageId ? 'Package Properties, ID ' + packageId : 'Create new Package',
			modal: true,
			hidden: true,
			width: 730,
			height: 580,
			layout: 'fit',
			plain: true,
			bodyStyle: 'padding:5px;',
			buttonAlign: 'right',
			items: packagePropsFormPanel
		});


		/******************************************************/
		// filterAssetStore ()
		/******************************************************/
		function filterAssetStore() {
			var value = Ext.getCmp('packages-assetGrid-filterField').getValue();
			var selectionsOnly = Ext.getCmp('packages-assetGrid-filterButton').pressed;
			if (value == '') {
				if (selectionsOnly) {
					assetStore.filterBy(filterChecked, assetSm);
				} else {
					assetStore.clearFilter();
				}
			} else {
				if (selectionsOnly) {
					assetStore.filter([
						{
							property: 'name',
							value: value,
							anyMatch: true,
							caseSensitive: false
						}, {
							fn: filterChecked,
							scope: assetSm
						}
					]);
				} else {
					assetStore.filter({ property: 'name', value: value, anyMatch: true, caseSensitive: false });
				}
			}
		};

		/******************************************************/
		// Load store(s), show window, and get properties
		/******************************************************/
		assetStore.clearFilter()
		appwindow.render(document.body)

		if (packageId) {
			let result = await Ext.Ajax.requestPromise({
				url: `${STIGMAN.Env.apiBase}/packages/${packageId}`,
				params: {
					elevate: curUser.canAdmin,
					projection: ['assets']
				},
				method: 'GET'
			})
			apiPackage = JSON.parse(result.response.responseText)
			packagePropsFormPanel.getForm().setValues(apiPackage)
		}
		Ext.getBody().unmask()
		appwindow.show(document.body)
	} //end showPackageProps

	async function showAssetProps(assetId) {
		try {
			let apiAsset
			let userAssignments = {}

			/******************************************************/
			// STIG Grid
			/******************************************************/
			var stigSm = new Ext.grid.CheckboxSelectionModel({
				checkOnly: true,
				onRefresh: function() {
					// ORIGINAL PRIVATE METHOD BELOW
					// var ds = this.grid.store, index;
					// var s = this.getSelections();
					// this.clearSelections(true);
					// for(var i = 0, len = s.length; i < len; i++){
						// var r = s[i];
						// if((index = ds.indexOfId(r.id)) != -1){
							// this.selectRow(index, true);
						// }
					// }
					// if(s.length != this.selections.getCount()){
						// this.fireEvent('selectionchange', this);
					// }
					
					var ds = this.grid.store, index;
					var s = this.getSelections();
					for(var i = 0, len = s.length; i < len; i++){
						var r = s[i];
						if((index = ds.indexOfId(r.id)) != -1){
							this.grid.view.addRowClass(index, this.grid.view.selectedRowClass);
						}
					}
				}
			});
			var stigGrid = new Ext.grid.GridPanel({
				title:'STIG assignments',
				hideHeaders: true,
				flex: 70,
				anchor: '100% 100%',
				id: 'assets-stigsGrid',
				hideLabel: true,
				isFormField: true,
				store: stigStore,
				cls: 'custom-stig-users',
				listeners: {
					celldblclick: function (grid,rowIndex,columnIndex,e) {
						if (grid.getSelectionModel().isSelected(rowIndex)) { 
							if (columnIndex == 2) {
								Ext.getBody().mask('Loading IAWF...');
								var record = grid.getStore().getAt(rowIndex);
								if (!(record.data.benchmarkId in userAssignments)) {
									// Initialize if this is a new STIG mapping for the Asset
									userAssignments[record.data.benchmarkId] = []
								}
								showStigReviewers(record.data.benchmarkId, userAssignments[record.data.benchmarkId]); // defined in this file
							}
						}
					}
				},
				columns: [
					stigSm,
					{ 	
						header: "Checklists", 
						width: 375,
						dataIndex: 'title',
						sortable: true
					},{ 
						header: "Icon",
						width: 30,
						dataIndex: 'icon'
					}
				],
				viewConfig: {
					forceFit: true
				},
				sm: stigSm,
				setValue: function(stigReviewers) {
					var selRecords = []
					stigReviewers.forEach(stig => {
						let record = stigStore.getById(stig.benchmarkId)
						selRecords.push(record)
						// User assignments
						userAssignments[stig.benchmarkId] = stig.reviewers
					})
					stigSm.selectRecords(selRecords);
				},
				getValue: function() {
					let stigReviewers = []
					let selectedStigs = stigSm.getSelections();
					selectedStigs.forEach(stigRecord => {
						// Map the userIds from the assignment object
						let userIds = stigRecord.data.benchmarkId in userAssignments ? userAssignments[stigRecord.data.benchmarkId].map(r => r.userId) : []
						stigReviewers.push({
							benchmarkId: stigRecord.data.benchmarkId,
							userIds: userIds
						})
					})
					return stigReviewers
				},
				markInvalid: function() {},
				clearInvalid: function() {},
				validate: function() { return true},
				isValid: function() { return true;},
				getName: function() {return this.name},
				tbar: new Ext.Toolbar({
					items: [
					{
					// START Filter control
						xtype: 'buttongroup',
						title: 'Filtering',
						items: [
						{
							xtype: 'trigger',
							fieldLabel: 'Filter',
							triggerClass: 'x-form-clear-trigger',
							onTriggerClick: function() {
								this.triggerBlur();
								this.blur();
								this.setValue('');
								filterStigStore();
							},
							id: 'assets-stigGrid-filterField',
							width: 140,
							submitValue: false,
							enableKeyEvents:true,
							emptyText:'Enter a STIG filter...',
							listeners: {
								keyup: function (field,e) {
									filterStigStore();
									return false;
								}
							}
						},{
							xtype: 'tbseparator'
						},{
							xtype: 'tbbutton',
							icon: 'img/tick_white.png',
							tooltip: 'Show assignments only',
							id: 'assets-stigGrid-filterButton',
							toggleGroup: 'stig-selector',
							enableToggle:true,
							allowDepress: true,
							toggleHandler: function (btn,state) {
								filterStigStore();
							}
						}]
					}]
				}),
				name: 'stigReviewers'
			});

			let deptStore = new Ext.data.JsonStore({
				fields: [{
					name: 'deptId',
					type: 'integer'
				},{
					name: 'name',
					type: 'string'
				}],
				url: `${STIGMAN.Env.apiBase}/departments?elevate=${curUser.canAdmin}`,
				root: '',
				sortInfo: {
					field: 'name',
					direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
				},
				idProperty: 'deptId'
			})

			/******************************************************/
			// Form panel
			/******************************************************/
			var assetPropsFormPanel = new Ext.form.FormPanel({
				baseCls: 'x-plain',
				labelWidth: 70,
				monitorValid: true,
				trackResetOnLoad: true,
				items: [
				{
					xtype: 'hidden',
					name: 'packageId',
					// override, because Ext insists on returning the string value from DOM
					getValue: function () {
						return this.value
					}
				},
				{ // start fieldset config
					xtype:'fieldset',
					title: 'Asset Information',
					autoHeight:true,
					items: [
					{ // start asset column config
						layout: 'column',
						baseCls: 'x-plain',
						items: [ // start asset column items
						{ // start column #1 config
							columnWidth: .50,
							layout: 'form',
							baseCls: 'x-plain',
							items: [
							{
								xtype: 'textfield',
								fieldLabel: 'Name',
								width: 150,
								emptyText: 'Enter asset name...',
								allowBlank: false,
								//disabled: !(curUser.canAdmin),
								name: 'name'
							},{
								xtype: 'textfield',
								id: 'assetProps-ip',
								fieldLabel: 'IP address',
								width: 150,
								emptyText: 'Enter asset IP address...',
								allowBlank: true,
								vtype: 'IPAddress',
								name: 'ip'
							}
							] // end column #1 items
						},// end column #1 config
						{ // column #2 config
							columnWidth: .50,
							layout: 'form',
							baseCls: 'x-plain',
							items: [
							{
								xtype: 'combo',
								fieldLabel: 'Department',
								width: 100,
								emptyText: 'Department...',
								allowBlank: false,
								editable: false,
								forceSelection: true,
								name: 'deptId',
								mode: 'local',
								triggerAction: 'all',
								hideTrigger: !(curUser.canAdmin || curUser.accessLevel == 4),
								readOnly: !(curUser.canAdmin || curUser.accessLevel == 4),
								//fieldClass: "x-item-disabled",
								displayField:'name',
								valueField: 'deptId',
								store: deptStore
							},
							{
								xtype: 'checkbox',
								id: 'assetProps-nonnetwork',
								name: 'nonnetwork',
								value: 'off',
								//disabled: !(curUser.canAdmin),
								boxLabel: 'Not networked',
								handler: function (cb,checked){
									var tf_ip = Ext.getCmp('assetProps-ip');
									tf_ip.setDisabled(checked);
									tf_ip.allowBlank = false;
									if (checked){
										tf_ip.setValue('');
									}
								}
							}
							]// end column #2 items
						} // end column #2 config
						]// end asset column items
					} // end asset column config
					] // end fieldset items
				} // end fieldset config
				,
				{
					layout: 'hbox',
					anchor: '100% -130',
					baseCls: 'x-plain',
					border: false,
					layoutConfig: {
						align: 'stretch'
					},
					items: [
						stigGrid
					]
				}
				], // end form items
				buttons: [{
					text: 'Cancel',
					handler: function(){
						appwindow.close();
					}
				},{
					text: 'Save',
					formBind: true,
					id: 'submit-button',
					handler: async function(){
						try {
							if (assetPropsFormPanel.getForm().isValid()) {
								let values = assetPropsFormPanel.getForm().getFieldValues(false, true) // dirtyOnly=false, getDisabled=true
								let url, method
								if (assetId) {
									url = `${STIGMAN.Env.apiBase}/assets/${assetId}?elevate=${curUser.canAdmin}`
									method = 'PUT'
								}
								else {
									url = `${STIGMAN.Env.apiBase}/assets?elevate=${curUser.canAdmin}`
									method = 'POST'
								}
								let result = await Ext.Ajax.requestPromise({
									url: url,
									method: method,
									headers: { 'Content-Type': 'application/json;charset=utf-8' },
									jsonData: values
								})
								apiAsset = JSON.parse(result.response.responseText)

								//TODO: This is expensive, should update the specific record instead of reloading entire set
								Ext.getCmp(`assetGrid-package`).getView().holdPosition = true
								Ext.getCmp(`assetGrid-package`).getStore().reload()
								appwindow.close()
							}
						}
						catch (e) {
							alert(e.message)
						}
					}
			}]
			});

			/******************************************************/
			// Form window
			/******************************************************/
			var appwindow = new Ext.Window({
				id: 'assetPropsWindow',
				title: assetId ? 'Asset Properties, ID ' + assetId : 'Create new Asset',
				modal: true,
				hidden: true,
				width: 730,
				height:520,
				layout: 'fit',
				plain:true,
				bodyStyle:'padding:5px;',
				buttonAlign:'right',
				items: assetPropsFormPanel
			});
			

			/******************************************************/
			// filterStigStore ()
			/******************************************************/
			function filterStigStore () {
				var value = Ext.getCmp('assets-stigGrid-filterField').getValue();
				var selectionsOnly = Ext.getCmp('assets-stigGrid-filterButton').pressed;
				if (value == '') {
					if (selectionsOnly) {
						stigStore.filterBy(filterChecked,stigSm);
					} else {
						stigStore.clearFilter();
					}
				} else {
					if (selectionsOnly) {
						stigStore.filter([
							{
								property:'title',
								value:value,
								anyMatch:true,
								caseSensitive:false
							},{
								fn: filterChecked,
								scope: stigSm
							}
						]);
					} else {
						stigStore.filter({property:'title',value:value,anyMatch:true,caseSensitive:false});
					}
				}
			};

	
			/******************************************************/
			// showStigReviewers
			/******************************************************/
			async function showStigReviewers (benchmarkId, assignedUsers) {
				try {
					var stigUserFields = Ext.data.Record.create([
						{	name:'userId',
							type: 'number'
						},{
							name:'username',
							type: 'string'
						},{
							name:'dept.name',
							type: 'string',
							mapping: 'dept.name'
						}
					]);
					var stigUserStore = new Ext.data.JsonStore({
						fields: stigUserFields,
						root: '',
						sortInfo: {
							field: 'username',
							direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
						},
						idProperty: 'userId'
					});
					var stigUserSm = new Ext.grid.CheckboxSelectionModel({
						checkOnly: true,
						onRefresh: function() {
							var ds = this.grid.store, index;
							var s = this.getSelections();
							for(var i = 0, len = s.length; i < len; i++){
								var r = s[i];
								if((index = ds.indexOfId(r.id)) != -1){
									this.grid.view.addRowClass(index, this.grid.view.selectedRowClass);
								}
							}
						},
						deselectRow: function (index, preventViewNotify) {
							if(this.isLocked()){
								return;
							}
							if(this.last == index){
								this.last = false;
							}
							if(this.lastActive == index){
								this.lastActive = false;
							}
							var r = this.grid.store.getAt(index);
							if(r && this.fireEvent('beforerowdeselect', this, index, r) !== false){
								this.selections.remove(r);
								if(!preventViewNotify){
									this.grid.getView().onRowDeselect(index);
								}
								this.fireEvent('rowdeselect', this, index, r);
								this.fireEvent('selectionchange', this);
							}
						},
					
						listeners: {
						}
					});
					var stigUserGrid = new Ext.grid.GridPanel({
						anchor: "100% 100%",
						id: 'assets-stigsGrid-usersGrid',
						hideHeaders: false,
						hideLabel: true,
						store: stigUserStore,
						columns: [
							stigUserSm,
							{ 	
								header: "Username", 
								width: 100,
								dataIndex: 'username',
								sortable: true
							},
		{ 	
								header: "Dept", 
								width: 50,
								dataIndex: 'dept.name',
								sortable: true
							}					
						],
						viewConfig: {
							forceFit: true,
							getRowClass: function(record, rowIndex, rp, ds) {
								if (curUser.accessLevel === 2 && !curUser.canAdmin) {
									if (record.data.deptId !== curUser.deptId) {
										return 'x-stigman-cross-department'
									}
								}
							}
						},
						sm: stigUserSm,
						setValue: function(assignedUsers) {
							var selRecords = []
							assignedUsers.forEach(user => {
								let record = stigUserStore.getById(user.userId)
								selRecords.push(record)
							})
							stigUserSm.selectRecords(selRecords);
						},
						getValue: function() {},
						markInvalid: function() {},
						clearInvalid: function() {},
						isValid: function() { return true;},
						getName: function() {return this.name},
						isFormField: true,
						tbar: new Ext.Toolbar({
							items: [
								{
									xtype: 'trigger',
									fieldLabel: 'Filter',
									triggerClass: 'x-form-clear-trigger',
									onTriggerClick: function() {
										this.triggerBlur();
										this.blur();
										this.setValue('');
										filterStigUserStore();
									},
									id: 'assets-stigUserGrid-filterField',
									width: 140,
									submitValue: false,
									enableKeyEvents:true,
									emptyText:'Enter a user filter...',
									listeners: {
										keyup: function (field,e) {
											filterStigUserStore();
											return false;
										}
									}
								},{
									xtype: 'tbseparator'
								},{
									xtype: 'tbbutton',
									icon: 'img/tick_white.png',
									tooltip: 'Show assigned users only',
									toggleGroup: 'stigUser-selector',
									id: 'assets-stigUserGrid-filterButton',
									enableToggle:true,
									allowDepress: true,
									toggleHandler: function (btn,state) {
										filterStigUserStore();
										}
									// toggleHandler: function (btn,state) {
										// if (state) {
											// //pressed
											// stigUserStore.filterBy(filterChecked,stigUserSm);
										// } else {
											// stigUserStore.clearFilter();
										// }
									// }
								}
							]
						}),
						name: 'users'
					});
					var stigUserFormPanel = new Ext.form.FormPanel({
						baseCls: 'x-plain',
						labelWidth: 85,
						items: stigUserGrid		
					});
					var stigUserWindow = new Ext.Window({
						//title: 'Reviewers: ' + record.data['title'],
						title: benchmarkId,
						modal: true,
						width: 280,
						height:440,
						layout: 'fit',
						plain:true,
						bodyStyle:'padding:5px;',
						buttonAlign:'center',
						items: stigUserFormPanel,
						buttons: [{
							text: 'Cancel',
							handler: function(){
								stigUserWindow.close();
							}
						},{
							text: 'OK',
							formBind: true,
							handler: function(){
								assignedUsers.length = 0
								let selectedUsers = stigUserSm.getSelections()
								selectedUsers.forEach(userRecord => {
									// assignedUsers.push({
									// 	userId: userRecord.data['userId'],
									// 	username: userRecord.data['username'],
									// 	dept: userRecord.data['dept']
									// })
									assignedUsers.push(userRecord.data)
								})
								stigUserWindow.close()
							}
						}]
					});

					let result = await Ext.Ajax.requestPromise({
						url: `${STIGMAN.Env.apiBase}/users`,
						params: {
							elevate: curUser.canAdmin,
							accessLevel: 1
						},
						method: 'GET'
					})
					let apiUsers = JSON.parse(result.response.responseText)
					if (curUser.accessLevel === 2 && !curUser.canAdmin) {
						// merge users from assignedUsers, ExtJS will handle any duplicate ids
						apiUsers = apiUsers.concat(assignedUsers)
					}
					stigUserStore.loadData(apiUsers)

					stigUserWindow.show(
						document.body,
						function () { // window.show()callback function
							Ext.getBody().unmask();
							stigUserWindow.getEl().mask('Loading...');
							stigUserGrid.setValue(assignedUsers);
							stigUserWindow.getEl().unmask();
						}
					);

					function filterStigUserStore () {
							var value = Ext.getCmp('assets-stigUserGrid-filterField').getValue();
							var selectionsOnly = Ext.getCmp('assets-stigUserGrid-filterButton').pressed;
							if (value == '') {
								if (selectionsOnly) {
									stigUserStore.filterBy(filterChecked,stigUserSm);
								} else {
									stigUserStore.clearFilter();
								}
							} else {
								if (selectionsOnly) {
									stigUserStore.filter([
										{
											property:'username',
											value:value,
											anyMatch:true,
											caseSensitive:false
										},{
											fn: filterChecked,
											scope: stigUserSm
										}
									]);
								} else {
									stigUserStore.filter({property:'username',value:value,anyMatch:true,caseSensitive:false});
								}
							}
					};
				}
				catch (e) {
					alert(e.message)
					Ext.getBody().unmask()
				}
			};
			
			/******************************************************/
			// Load store(s), show window, and get properties
			/******************************************************/

			stigStore.clearFilter();

			// Get departments for the combo box
			let resultDept = await Ext.Ajax.requestPromise({
				url: `${STIGMAN.Env.apiBase}/departments`,
				params: {
					elevate: curUser.canAdmin
				},
				method: 'GET'
			})
			deptStore.loadData(JSON.parse(resultDept.response.responseText))

			appwindow.render(document.body);

			if (assetId) {
				let result = await Ext.Ajax.requestPromise({
					url: `${STIGMAN.Env.apiBase}/assets/${assetId}`,
					params: {
						elevate: curUser.canAdmin,
						projection: ['stigReviewers']
					},
					method: 'GET'
				})
				apiAsset = JSON.parse(result.response.responseText)
				apiAsset.deptId = apiAsset.dept.deptId
				apiAsset.packageId = apiAsset.package.packageId
				assetPropsFormPanel.getForm().setValues(apiAsset)

				var nonnetworked = Ext.getCmp('assetProps-nonnetwork').getValue();
				var tf_ip = Ext.getCmp('assetProps-ip');
				
				tf_ip.setDisabled(nonnetworked);
				if (nonnetworked ){
					tf_ip.setValue('');
				}
			}
			else {
				// For new asset, set default department
				assetPropsFormPanel.getForm().setValues({
					deptId: curUser.canAdmin ? 0 : curUser.dept.deptId
				})
			}
			
			Ext.getBody().unmask();
			appwindow.show(document.body);
		}
		catch (e) {
			alert(e.message)
			Ext.getBody().unmask()
		}	
	} //end showAssetProps


	var thisTab = Ext.getCmp('admin-center-tab').add({
		id: 'package-admin-tab',
		iconCls: 'sm-package-icon',
		title: 'Packages',
		closable: true,
		layout: 'border',
		items: [packageGrid, assetGrid]
	});
	thisTab.show();

	packageGrid.getStore().load({
		params: {
			elevate: curUser.canAdmin
		}
	});


} // end addPackageAdmin()