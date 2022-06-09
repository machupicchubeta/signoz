/* eslint-disable react/no-unstable-nested-components */
import { notification } from 'antd';
import updateDashboardApi from 'api/dashboard/update';
import useComponentPermission from 'hooks/useComponentPermission';
import React, { useCallback, useEffect, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	ToggleAddWidget,
	ToggleAddWidgetProps,
} from 'store/actions/dashboard/toggleAddWidget';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_DASHBOARD } from 'types/actions/dashboard';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';

import Graph from './Graph';
import GraphLayoutContainer from './GraphLayout';
import { UpdateDashboard } from './utils';

export const getPreLayouts = (
	widgets: Widgets[] | undefined,
	layout: Layout[],
): LayoutProps[] =>
	layout.map((e, index) => ({
		...e,
		Component: ({ setLayout }: ComponentProps): JSX.Element => {
			const widget = widgets?.find((widget) => widget.id === e.i);

			return (
				<Graph
					name={e.i + index}
					widget={widget as Widgets}
					yAxisUnit={widget?.yAxisUnit}
					layout={layout}
					setLayout={setLayout}
				/>
			);
		},
	}));

function GridGraph(props: Props): JSX.Element {
	const { toggleAddWidget } = props;
	const [addPanelLoading, setAddPanelLoading] = useState(false);
	const { t } = useTranslation(['common']);
	const { dashboards, isAddWidget } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const [saveLayoutPermission] = useComponentPermission(['save_layout'], role);
	const [saveLayoutState, setSaveLayoutState] = useState<State>({
		loading: false,
		error: false,
		errorMessage: '',
		payload: [],
	});
	const [selectedDashboard] = dashboards;
	const { data } = selectedDashboard;
	const { widgets } = data;
	const dispatch = useDispatch<Dispatch<AppActions>>();

		// when the layout is not present
		if (data.layout === undefined) {
			return widgets.map((e, index) => {
				return {
					h: 2,
					w: 6,
					y: Infinity,
					i: (index + 1).toString(),
					x: (index % 2) * 6,
					Component: (): JSX.Element => (
						<Graph
							name={`${e.id + index}non-expanded`}
							isDeleted={isDeleted}
							widget={widgets[index]}
							yAxisUnit={e.yAxisUnit}
						/>
					),
				};
			});
		}

		return widgets.map((widget, index) => {
			const allLayouts = data?.layout;
			const lastLayout = (data?.layout || [])[(allLayouts?.length || 0) - 1];

			const currentLayout = (allLayouts || [])[index] || {
				h: lastLayout.h,
				i: widget.id,
				w: lastLayout.w,
				x: (lastLayout.x % 2) * 6,
				y: lastLayout.y,
			};

			return {
				...currentLayout,
				Component: (): JSX.Element => (
					<Graph
						name={widget.id + index}
						isDeleted={isDeleted}
						widget={widget}
						yAxisUnit={widget.yAxisUnit}
					/>
				),
			};
		});
	}, [widgets, data.layout]);

	useEffect(() => {
		(async (): Promise<void> => {
			if (!isAddWidget) {
				const isEmptyLayoutPresent = layouts.find((e) => e.i === 'empty');
				if (isEmptyLayoutPresent) {
					// non empty layout
					const updatedLayout = layouts.filter((e) => e.i !== 'empty');
					// non widget
					const updatedWidget = widgets?.filter((e) => e.id !== 'empty');
					setLayout(updatedLayout);

					const updatedDashboard: Dashboard = {
						...selectedDashboard,
						data: {
							...selectedDashboard.data,
							layout: updatedLayout,
							widgets: updatedWidget,
						},
					};

					await updateDashboardApi({
						data: updatedDashboard.data,
						uuid: updatedDashboard.uuid,
					});

					dispatch({
						type: UPDATE_DASHBOARD,
						payload: updatedDashboard,
					});
				}
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onDropHandler = useCallback(
		async (allLayouts: Layout[], currentLayout: Layout, event: DragEvent) => {
			event.preventDefault();
			if (event.dataTransfer) {
				try {
					const graphType = event.dataTransfer.getData('text') as GRAPH_TYPES;
					const generateWidgetId = v4();
					
					await updateDashboard({
						data,
						generateWidgetId,
						graphType,
						selectedDashboard,
						layout: allLayouts
							.map((e, index) => ({
								...e,
								i: index.toString(),
								// when a new element drops
								w: e.i === '__dropping-elem__' ? 6 : e.w,
								h: e.i === '__dropping-elem__' ? 2 : e.h,
							}))
							// removing add widgets layout config
							.filter((e) => e.maxW === undefined),
					});
				} catch (error) {
					notification.error({
						message:
							error instanceof Error ? error.toString() : 'Something went wrong',
					});
					if (response.statusCode === 200) {
						setSaveLayoutState((state) => ({
							...state,
							error: false,
							errorMessage: '',
							loading: false,
						}));
					} else {
						setSaveLayoutState((state) => ({
							...state,
							error: true,
							errorMessage: response.error || 'Something went wrong',
							loading: false,
						}));
					}
				}
			} catch (error) {
				console.error(error);
			}
		},
		[
			data.description,
			data.name,
			data.tags,
			data.title,
			data.widgets,
			saveLayoutPermission,
			selectedDashboard.uuid,
		],
	);

	const setLayoutFunction = useCallback(
		(layout: Layout[]) => {
			setLayout(
				layout.map((e) => {
					const currentWidget =
						widgets?.find((widget) => widget.id === e.i) || ({} as Widgets);

					return {
						...e,
						Component: (): JSX.Element => (
							<Graph
								name={currentWidget.id}
								widget={currentWidget}
								yAxisUnit={currentWidget?.yAxisUnit}
								layout={layout}
								setLayout={setLayout}
							/>
						),
					};
				}),
			);
		},
		[widgets],
	);

	const onEmptyWidgetHandler = useCallback(async () => {
		try {
			const id = 'empty';

			const layout = [
				{
					i: id,
					w: 6,
					x: 0,
					h: 2,
					y: 0,
				},
				...(data.layout || []),
			];

			await UpdateDashboard({
				data,
				generateWidgetId: id,
				graphType: 'EMPTY_WIDGET',
				selectedDashboard,
				layout,
				isRedirected: false,
			});

			setLayoutFunction(layout);
		} catch (error) {
			notification.error({
				message: error instanceof Error ? error.toString() : 'Something went wrong',
			});
		}
	}, [data, selectedDashboard, setLayoutFunction]);

	const onLayoutChangeHandler = async (layout: Layout[]): Promise<void> => {
		setLayoutFunction(layout);

		await onLayoutSaveHandler(layout);
	};

	const onAddPanelHandler = useCallback(() => {
		try {
			setAddPanelLoading(true);
			const isEmptyLayoutPresent =
				layouts.find((e) => e.i === 'empty') !== undefined;

			if (!isEmptyLayoutPresent) {
				onEmptyWidgetHandler()
					.then(() => {
						setAddPanelLoading(false);
						toggleAddWidget(true);
					})
					.catch(() => {
						notification.error(t('something_went_wrong'));
					});
			} else {
				toggleAddWidget(true);
				setAddPanelLoading(false);
			}
		} catch (error) {
			if (typeof error === 'string') {
				notification.error({
					message: error || t('something_went_wrong'),
				});
			}
		}
	}, [layouts, onEmptyWidgetHandler, t, toggleAddWidget]);

	return (
		<GraphLayoutContainer
			{...{
				addPanelLoading,
				layouts,
				onAddPanelHandler,
				onLayoutChangeHandler,
				onLayoutSaveHandler,
				saveLayoutState,
				widgets,
				setLayout,
			}}
		/>
	);
}

interface ComponentProps {
	setLayout: React.Dispatch<React.SetStateAction<LayoutProps[]>>;
}

export interface LayoutProps extends Layout {
	Component: (props: ComponentProps) => JSX.Element;
}

export interface State {
	loading: boolean;
	error: boolean;
	payload: Layout[];
	errorMessage: string;
}

interface DispatchProps {
	toggleAddWidget: (
		props: ToggleAddWidgetProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	toggleAddWidget: bindActionCreators(ToggleAddWidget, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(GridGraph);
